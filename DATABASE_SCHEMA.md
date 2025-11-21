# CodeDript Database Schema Documentation

## Overview
This document describes the complete MongoDB database schema for the CodeDript Agreement Manager platform.

---

## 📊 Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                            USER                                      │
├─────────────────────────────────────────────────────────────────────┤
│ _id                  : ObjectId (PK)                                │
│ email                : String (unique, required)                    │
│ walletAddress        : String (unique, required, Ethereum address)  │
│ role                 : Enum ['client', 'developer', 'both']         │
│ profile              : Object {                                     │
│   name, bio, skills[], portfolio, avatar, location, hourlyRate     │
│ }                                                                   │
│ reputation           : Object { rating, reviewCount }               │
│ statistics           : Object {                                     │
│   gigsPosted, agreementsCreated, agreementsCompleted,              │
│   totalEarned, totalSpent                                          │
│ }                                                                   │
│ isActive             : Boolean                                      │
│ isVerified           : Boolean                                      │
│ createdAt, updatedAt : Date                                         │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          │ creates
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            GIG                                       │
├─────────────────────────────────────────────────────────────────────┤
│ _id                  : ObjectId (PK)                                │
│ developer            : ObjectId → User (FK, required)               │
│ title                : String (required, 10-200 chars)              │
│ description          : String (required, 50-5000 chars)             │
│ category             : Enum (web-dev, mobile-dev, blockchain, etc.) │
│ subcategory          : String                                       │
│ skills               : String[]                                     │
│ pricing              : Object {                                     │
│   type: ['fixed', 'hourly'],                                       │
│   amount: Number,                                                  │
│   currency: ['ETH', 'USD']                                         │
│ }                                                                   │
│ deliveryTime         : Number (days, 1-365)                         │
│ revisions            : Number                                       │
│ images               : Object[] { url, publicId }                   │
│ tags                 : String[]                                     │
│ status               : Enum ['draft', 'active', 'paused']           │
│ createdAt, updatedAt : Date                                         │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          │ used to create
                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              AGREEMENT                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ _id                  : ObjectId (PK)                                         │
│ agreementId          : String (unique, auto: AGR-timestamp-00001)            │
│ client               : ObjectId → User (FK, required)                        │
│ developer            : ObjectId → User (FK, required)                        │
│ gig                  : ObjectId → Gig (FK, optional)                         │
│                                                                              │
│ project              : Object {                                              │
│   name, description, requirements,                                          │
│   deliverables[], startDate, expectedEndDate, actualEndDate                │
│ }                                                                            │
│                                                                              │
│ financials           : Object {                                              │
│   totalValue, currency, releasedAmount, remainingAmount,                   │
│   platformFee: { percentage, amount }                                      │
│ }                                                                            │
│                                                                              │
│ milestones           : ObjectId[] → Milestone (FK array)                     │
│ milestoneStats       : Object {                                              │
│   total, completed, approved, pending                                      │
│ }                                                                            │
│                                                                              │
│ documents            : Object {                                              │
│   contractPdf: { url, ipfsHash, supabaseId, uploadedAt },                 │
│   projectFiles: [{                                                         │
│     name, url, ipfsHash, supabaseId, description,                         │
│     uploadedBy → User, uploadedAt                                         │
│   }],                                                                      │
│   additionalFiles: [{ name, url, supabaseId, uploadedBy, uploadedAt }]   │
│ }                                                                            │
│                                                                              │
│ modifications        : Object[] {                                            │
│   (Change Requests Array)                                                  │
│   modifiedBy → User, modificationType, description,                        │
│   previousValue, newValue, additionalCost,                                │
│   status: ['pending', 'approved', 'rejected'],                            │
│   approvedBy → User, approvalTxHash,                                      │
│   requestedAt, respondedAt                                                │
│ }                                                                            │
│                                                                              │
│ status               : Enum [                                                │
│   'draft',                    ← Client created, uploading files            │
│   'pending_developer',        ← Waiting for dev to add milestones          │
│   'pending_client',           ← Waiting for client to approve milestones   │
│   'pending_signatures',       ← Both agreed, waiting for signatures        │
│   'escrow_deposit',           ← Client signing & depositing funds          │
│   'active',                   ← Both signed, funds locked, work ongoing    │
│   'in_progress',              ← Project work in progress                   │
│   'awaiting_final_approval',  ← All milestones done                        │
│   'completed',                ← Final delivery approved                    │
│   'cancelled', 'disputed'                                                 │
│ ]                                                                            │
│                                                                              │
│ signatures           : Object {                                              │
│   client: {                                                                │
│     signed, signedAt, walletAddress, transactionHash, message            │
│   },                                                                       │
│   developer: {                                                             │
│     signed, signedAt, walletAddress, transactionHash, message            │
│   }                                                                        │
│ }                                                                            │
│                                                                              │
│ blockchain           : Object {                                              │
│   isRecorded, transactionHash, blockNumber,                               │
│   ipfsHash, metadataHash, contractAddress, recordedAt,                   │
│   network: ['mainnet', 'sepolia', 'goerli', 'polygon', 'mumbai', 'local']│
│ }                                                                            │
│                                                                              │
│ escrow               : Object {                                              │
│   totalAmount, heldAmount, releasedAmount,                                │
│   status: ['pending', 'locked', 'releasing', 'completed'],               │
│   depositTxHash, smartContractAddress                                    │
│ }                                                                            │
│                                                                              │
│ finalDelivery        : Object {                                              │
│   ipfsHash, deliveredAt, clientApproved, approvedAt,                     │
│   ownershipTransferTxHash, finalPaymentTxHash                            │
│ }                                                                            │
│                                                                              │
│ terms                : Object {                                              │
│   paymentTerms, cancellationPolicy, revisionPolicy,                       │
│   communicationGuidelines                                                 │
│ }                                                                            │
│                                                                              │
│ metadata             : Object {                                              │
│   lastActivityAt, isActive, priority                                      │
│ }                                                                            │
│                                                                              │
│ createdAt, updatedAt : Date                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
                          │
                          │ has many
                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            MILESTONE                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ _id                  : ObjectId (PK)                                         │
│ agreement            : ObjectId → Agreement (FK, required)                   │
│ milestoneNumber      : Number (required, min: 1)                             │
│ title                : String (required, max: 200)                           │
│ description          : String (required, max: 2000)                          │
│ deliverables         : String[]                                              │
│                                                                              │
│ financials           : Object {                                              │
│   value, currency, isPaid, paidAt, transactionHash                         │
│ }                                                                            │
│                                                                              │
│ timeline             : Object {                                              │
│   startDate, dueDate, completedDate, approvedDate                          │
│ }                                                                            │
│                                                                              │
│ status               : Enum [                                                │
│   'pending',              ← Not started                                     │
│   'in_progress',          ← Developer working                               │
│   'submitted',            ← Developer submitted demo                        │
│   'in_review',            ← Client reviewing                                │
│   'revision_requested',   ← Client requested changes                        │
│   'completed',            ← Developer marked complete                       │
│   'approved',             ← Client approved                                 │
│   'paid',                 ← Payment released                                │
│   'rejected'              ← Client rejected                                 │
│ ]                                                                            │
│                                                                              │
│ submission           : Object {                                              │
│   submittedBy → User, submittedAt, notes,                                  │
│   demoFiles: [{                                                            │
│     name, url, ipfsHash, supabaseId, description, uploadedAt             │
│   }],                                                                      │
│   files: [{ name, url, supabaseId, uploadedAt }]                          │
│ }                                                                            │
│                                                                              │
│ review               : Object {                                              │
│   reviewedBy → User, reviewedAt, rating, feedback, revisionNotes          │
│ }                                                                            │
│                                                                              │
│ revisions            : Object[] {                                            │
│   revisionNumber, requestedBy → User, requestedAt, reason,                │
│   submittedAt, files: [{ name, url, supabaseId }]                         │
│ }                                                                            │
│                                                                              │
│ blockchain           : Object {                                              │
│   isRecorded, completionTxHash, approvalTxHash, paymentTxHash,            │
│   network: ['mainnet', 'sepolia', ...]                                    │
│ }                                                                            │
│                                                                              │
│ payment              : Object {                                              │
│   released, releasedAt, releasedAmount, releaseTxHash                     │
│ }                                                                            │
│                                                                              │
│ metadata             : Object {                                              │
│   priority, isActive, lastActivityAt                                      │
│ }                                                                            │
│                                                                              │
│ createdAt, updatedAt : Date                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
                          │
                          │ generates
                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          TRANSACTION                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ _id                  : ObjectId (PK)                                         │
│ transactionId        : String (unique, auto: TXN-XX-timestamp-00001)         │
│ agreement            : ObjectId → Agreement (FK, optional)                   │
│ milestone            : ObjectId → Milestone (FK, optional)                   │
│                                                                              │
│ type                 : Enum [                                                │
│   'contract_creation',      ← Initial contract on blockchain               │
│   'escrow_deposit',         ← Client deposits funds                        │
│   'contract_signature',     ← Signature transaction                        │
│   'milestone_completion',   ← Developer marks complete                     │
│   'milestone_approval',     ← Client approves milestone                    │
│   'milestone_payment',      ← Payment released                             │
│   'change_request',         ← Change request initiated                     │
│   'change_request_payment', ← Additional payment                           │
│   'change_request_approval',← Change approved                              │
│   'final_delivery',         ← Final delivery                               │
│   'final_approval',         ← Client final approval                        │
│   'final_payment',          ← Final payment released                       │
│   'ownership_transfer',     ← Ownership transferred                        │
│   'contract_update',        ← Contract modified                            │
│   'refund', 'platform_fee', 'withdrawal', 'dispute_raised',               │
│   'contract_cancellation'                                                 │
│ ]                                                                            │
│                                                                              │
│ from                 : Object {                                              │
│   user → User, walletAddress                                              │
│ }                                                                            │
│                                                                              │
│ to                   : Object {                                              │
│   user → User, walletAddress                                              │
│ }                                                                            │
│                                                                              │
│ amount               : Object {                                              │
│   value, currency, usdValue                                               │
│ }                                                                            │
│                                                                              │
│ fees                 : Object {                                              │
│   platformFee, networkFee, totalFees                                      │
│ }                                                                            │
│                                                                              │
│ status               : Enum [                                                │
│   'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded' │
│ ]                                                                            │
│                                                                              │
│ blockchain           : Object {                                              │
│   isOnChain, network, transactionHash, blockNumber, blockHash,            │
│   contractAddress, gasUsed, gasPrice, confirmations,                      │
│   eventData: { eventName, args }                                          │
│ }                                                                            │
│                                                                              │
│ metadata             : Object {                                              │
│   description, notes, initiatedBy → User, ipAddress, userAgent            │
│ }                                                                            │
│                                                                              │
│ timestamps           : Object {                                              │
│   initiated, processed, completed, failed                                 │
│ }                                                                            │
│                                                                              │
│ error                : Object {                                              │
│   code, message, stack                                                    │
│ }                                                                            │
│                                                                              │
│ receipt              : Object {                                              │
│   receiptId, receiptUrl, generatedAt                                      │
│ }                                                                            │
│                                                                              │
│ createdAt, updatedAt : Date                                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        CONTRACT VERSION                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ _id                  : ObjectId (PK)                                         │
│ agreement            : ObjectId → Agreement (FK, required)                   │
│ versionNumber        : Number (required, auto-increment)                     │
│ ipfsHash             : String (required)                                     │
│ metadataHash         : String                                                │
│                                                                              │
│ changes              : Object[] {                                            │
│   field, oldValue, newValue, description                                   │
│ }                                                                            │
│                                                                              │
│ modifiedBy           : ObjectId → User (FK, required)                        │
│ reason               : String (max: 1000)                                    │
│                                                                              │
│ blockchain           : Object {                                              │
│   updateTxHash, blockNumber, network                                       │
│ }                                                                            │
│                                                                              │
│ status               : Enum [                                                │
│   'draft', 'pending_approval', 'approved', 'rejected', 'active'           │
│ ]                                                                            │
│                                                                              │
│ approvals            : Object[] {                                            │
│   user → User, approved, approvedAt, signature, transactionHash           │
│ }                                                                            │
│                                                                              │
│ metadata             : Object {                                              │
│   isActive, createdBy → User                                              │
│ }                                                                            │
│                                                                              │
│ createdAt, updatedAt : Date                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 System Workflow & Status Flow

### **Agreement Status Flow:**
```
1. draft                    → Client creates agreement, uploads project files
2. pending_developer        → Developer reviews, adds milestones with pricing
3. pending_client           → Client reviews/approves milestones or requests changes
4. pending_signatures       → Both agreed on terms, ready to sign
5. escrow_deposit           → Client signs with MetaMask, deposits total amount
6. active                   → Developer signs, contract recorded on blockchain, funds locked in escrow
7. in_progress              → Work ongoing, milestones being completed
8. awaiting_final_approval  → All milestones approved, final delivery pending
9. completed                → Client approves final delivery, ownership transferred, funds released

Can transition to: cancelled, disputed at any stage
```

### **Milestone Status Flow:**
```
1. pending              → Not started
2. in_progress          → Developer working
3. submitted            → Developer uploads demo to IPFS for review
4. in_review            → Client reviewing submission
5. revision_requested   → Client requests changes (loops back to in_progress)
6. completed            → Developer marks as complete
7. approved             → Client approves → Recorded on blockchain
8. paid                 → Payment released from escrow to developer

Transaction recorded on blockchain at: completion, approval, payment release
```

### **Transaction Types Mapping:**
```
contract_creation       → Agreement moves to 'active' (blockchain recorded)
escrow_deposit          → Client deposits funds (Agreement.escrow.depositTxHash)
contract_signature      → Client/Developer signs (Agreement.signatures.*.transactionHash)
milestone_completion    → Developer marks milestone done (Milestone.blockchain.completionTxHash)
milestone_approval      → Client approves milestone (Milestone.blockchain.approvalTxHash)
milestone_payment       → Payment released (Milestone.payment.releaseTxHash)
change_request_payment  → Additional funds added to escrow
final_delivery          → Final project delivered (Agreement.finalDelivery.ipfsHash)
final_approval          → Client approves final delivery
final_payment           → Final escrow release (Agreement.finalDelivery.finalPaymentTxHash)
ownership_transfer      → Ownership transferred to client (Agreement.finalDelivery.ownershipTransferTxHash)
```

---

## 📋 Key Features & Capabilities

### **1. MetaMask Authentication**
- Users login/register with `walletAddress`
- Both client and developer roles supported
- Wallet verification required for all blockchain transactions

### **2. Gig Marketplace**
- Developers create gigs with pricing and deliverables
- Clients browse gigs and initiate contracts
- Categories: web-dev, mobile-dev, blockchain, AI/ML, etc.

### **3. Contract Creation Process**
1. Client selects gig → creates agreement → uploads project files to IPFS
2. Agreement status: `draft` → `pending_developer`
3. Developer reviews → adds milestones with pricing → signs
4. Agreement status: `pending_developer` → `pending_client`
5. Client reviews milestones → approves or requests changes
6. If approved: `pending_client` → `pending_signatures`

### **4. Escrow & Blockchain Recording**
1. Both parties sign with MetaMask
2. Client signature triggers escrow deposit (total project value)
3. Contract PDF uploaded to IPFS → CID stored
4. Metadata uploaded to IPFS → CID stored
5. Both IPFS hashes + metadata recorded on Ethereum blockchain
6. `Agreement.blockchain.transactionHash` stores blockchain TX
7. `Agreement.escrow.status` = 'locked'
8. Funds held in smart contract escrow

### **5. Milestone Workflow**
1. Developer completes milestone → uploads demo to IPFS
2. `Milestone.submission.demoFiles` stores IPFS hashes
3. Status: `in_progress` → `submitted` → `in_review`
4. Client reviews → approves/rejects/requests revision
5. If approved:
   - Recorded on blockchain (`Milestone.blockchain.approvalTxHash`)
   - Payment released from escrow (`Milestone.payment.releaseTxHash`)
   - `Milestone.status` = 'paid'

### **6. Change Requests**
1. Client requests changes during project
2. Stored in `Agreement.modifications[]`
3. Developer approves → adds additional cost
4. Client pays additional amount → added to escrow
5. Change approval recorded on blockchain (`approvalTxHash`)

### **7. Final Delivery & Ownership Transfer**
1. All milestones completed and paid
2. Agreement status: `awaiting_final_approval`
3. Developer delivers final project to IPFS
4. Client reviews and approves
5. Final approval triggers:
   - Ownership transfer transaction (`ownershipTransferTxHash`)
   - Any remaining escrow funds released (`finalPaymentTxHash`)
   - Agreement status: `completed`

### **8. Version Control**
- `ContractVersion` model tracks all contract modifications
- Each change creates new IPFS hash
- Both parties must approve changes
- Version history maintained on blockchain

---

## 🔗 Relationships

```
User (1) ──── (many) Gig
User (1) ──── (many) Agreement (as client)
User (1) ──── (many) Agreement (as developer)
Gig (1) ──── (many) Agreement
Agreement (1) ──── (many) Milestone
Agreement (1) ──── (many) Transaction
Agreement (1) ──── (many) ContractVersion
Milestone (1) ──── (many) Transaction
User (1) ──── (many) Transaction (as sender/receiver)
```

---

## 📌 Indexes

### User
- `email` (unique)
- `walletAddress` (unique)

### Gig
- `developer`
- `status`
- `category`

### Agreement
- `agreementId` (unique)
- `client, status` (compound)
- `developer, status` (compound)
- `blockchain.transactionHash`

### Milestone
- `agreement, milestoneNumber` (compound, unique)
- `agreement, status` (compound)
- `timeline.dueDate`

### Transaction
- `transactionId` (unique)
- `blockchain.transactionHash`
- `agreement, type` (compound)
- `from.user, status` (compound)
- `to.user, status` (compound)

### ContractVersion
- `agreement, versionNumber` (compound, unique)
- `blockchain.updateTxHash`

---

## ✅ Model Alignment Summary

All models now fully align with your system process:

✅ **User** - MetaMask authentication with wallet addresses
✅ **Gig** - Developer marketplace listings
✅ **Agreement** - Complete contract lifecycle with processing states, escrow, signatures, change requests, final delivery
✅ **Milestone** - Demo submissions, client reviews, blockchain recording, payment releases
✅ **Transaction** - All transaction types tracked with blockchain hashes and event data
✅ **ContractVersion** - Version control for contract modifications

---

**Last Updated:** November 21, 2025
