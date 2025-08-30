;; EcoNFT Smart Contract
;; Implements SIP-009 NFT standard for the EcoTourNFT platform.
;; Manages minting, transferring, and tracking of NFTs with conservation metadata.
;; Integrates with FundingDistributor for automated fund distribution.

;; Traits
(define-trait funding-distributor-trait
  (
    (initiate-distribution (uint (string-ascii 10)) (response uint uint))
  )
)

;; Constants
(define-constant ERR-UNAUTHORIZED u100)
(define-constant ERR-PAUSED u101)
(define-constant ERR-INVALID-AMOUNT u102)
(define-constant ERR-INVALID-TOKEN-ID u103)
(define-constant ERR-ALREADY-MINTED u104)
(define-constant ERR-NOT-OWNER u105)
(define-constant ERR-INVALID-METADATA u106)
(define-constant ERR-INVALID-RECIPIENT u107)
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ROYALTY-PERCENTAGE u500) ;; 5% royalty (500 basis points)
(define-constant MAX-NFT-SUPPLY u1000) ;; Max 1000 NFTs

;; Data Variables
(define-data-var paused bool false)
(define-data-var last-token-id uint u0)
(define-data-var funding-distributor principal 'SP1XPG9QFX5M95G36SGN9R8YJ4KJ0JB7ZXNH892N6.funding-distributor)

;; Data Maps
(define-map nfts
  { token-id: uint }
  {
    owner: principal,
    metadata: (string-ascii 256), ;; Conservation project metadata (e.g., "Amazon Reforestation")
    royalty-recipient: principal,
    minted: bool
  }
)

(define-map token-uri
  { token-id: uint }
  { uri: (string-ascii 256) }
)

;; SIP-009: Get last token ID
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; SIP-009: Get token URI
(define-read-only (get-token-uri (token-id uint))
  (match (map-get? token-uri {token-id: token-id})
    uri (ok (some (get uri uri)))
    (ok none)
  )
)

;; SIP-009: Get token owner
(define-read-only (get-owner (token-id uint))
  (match (map-get? nfts {token-id: token-id})
    nft (ok (some (get owner nft)))
    (err ERR-INVALID-TOKEN-ID)
  )
)

;; SIP-009: Transfer token
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (let
    (
      (nft (unwrap! (map-get? nfts {token-id: token-id}) (err ERR-INVALID-TOKEN-ID)))
    )
    (asserts! (not (var-get paused)) (err ERR-PAUSED))
    (asserts! (is-eq tx-sender sender) (err ERR-UNAUTHORIZED))
    (asserts! (is-eq (get owner nft) sender) (err ERR-NOT-OWNER))
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-INVALID-RECIPIENT))
    (map-set nfts
      {token-id: token-id}
      (merge nft {owner: recipient})
    )
    (ok true)
  )
)

;; Mint a new NFT
(define-public (mint (recipient principal) (metadata (string-ascii 256)) (uri (string-ascii 256)) (price uint))
  (let
    (
      (token-id (+ (var-get last-token-id) u1))
    )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) (err ERR-UNAUTHORIZED))
    (asserts! (not (var-get paused)) (err ERR-PAUSED))
    (asserts! (<= token-id MAX-NFT-SUPPLY) (err ERR-INVALID-AMOUNT))
    (asserts! (> (len metadata) u0) (err ERR-INVALID-METADATA))
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-INVALID-RECIPIENT))
    ;; Transfer payment to contract
    (try! (stx-transfer? price tx-sender (as-contract tx-sender)))
    ;; Record NFT
    (map-set nfts
      {token-id: token-id}
      {
        owner: recipient,
        metadata: metadata,
        royalty-recipient: recipient,
        minted: true
      }
    )
    (map-set token-uri
      {token-id: token-id}
      {uri: uri}
    )
    (var-set last-token-id token-id)
    ;; Distribute funds
    (try! (distribute-funds token-id price))
    (ok token-id)
  )
)

;; Distribute funds to FundingDistributor
(define-private (distribute-funds (token-id uint) (amount uint))
  (let
    (
      (distributor (var-get funding-distributor))
    )
    (as-contract
      (try! (contract-call? distributor initiate-distribution amount "STX"))
    )
    (ok true)
  )
)

;; Update royalty recipient
(define-public (update-royalty-recipient (token-id uint) (new-recipient principal))
  (let
    (
      (nft (unwrap! (map-get? nfts {token-id: token-id}) (err ERR-INVALID-TOKEN-ID)))
    )
    (asserts! (is-eq tx-sender (get owner nft)) (err ERR-UNAUTHORIZED))
    (asserts! (not (var-get paused)) (err ERR-PAUSED))
    (asserts! (not (is-eq new-recipient 'SP000000000000000000002Q6VF78)) (err ERR-INVALID-RECIPIENT))
    (map-set nfts
      {token-id: token-id}
      (merge nft {royalty-recipient: new-recipient})
    )
    (ok true)
  )
)

;; Pay royalty on secondary sale
(define-public (pay-royalty (token-id uint) (sale-price uint))
  (let
    (
      (nft (unwrap! (map-get? nfts {token-id: token-id}) (err ERR-INVALID-TOKEN-ID)))
      (royalty-amount (/ (* sale-price ROYALTY-PERCENTAGE) u10000))
    )
    (asserts! (not (var-get paused)) (err ERR-PAUSED))
    (asserts! (> sale-price u0) (err ERR-INVALID-AMOUNT))
    (try! (stx-transfer? royalty-amount tx-sender (get royalty-recipient nft)))
    ;; Distribute remaining funds
    (try! (distribute-funds token-id (- sale-price royalty-amount)))
    (ok true)
  )
)

;; Admin Functions
(define-public (pause-contract)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) (err ERR-UNAUTHORIZED))
    (var-set paused true)
    (ok true)
  )
)

(define-public (unpause-contract)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) (err ERR-UNAUTHORIZED))
    (var-set paused false)
    (ok true)
  )
)

(define-public (set-funding-distributor (new-distributor principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) (err ERR-UNAUTHORIZED))
    (var-set funding-distributor new-distributor)
    (ok true)
  )
)

;; Read-Only Functions
(define-read-only (get-nft-details (token-id uint))
  (map-get? nfts {token-id: token-id})
)

(define-read-only (is-contract-paused)
  (var-get paused)
)

(define-read-only (get-funding-distributor)
  (var-get funding-distributor)
)