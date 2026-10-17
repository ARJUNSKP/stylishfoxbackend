# 🦊 StyleFox Backend — Complete API Reference & Documentation

**Base URL**: `http://localhost:8000`  
**API Version**: `v1` (`/api/v1`)  
**Content-Type**: `application/json`  

---

## 📑 Table of Contents
1. [Authentication (`/api/v1/auth`)](#1-authentication-apiv1auth)
   - [Register User](#11-register-user)
   - [Login User](#12-login-user)
   - [Get Current User Profile](#13-get-current-user-authme)
2. [Users & Address Management (`/api/v1/users`)](#2-users--address-management-apiv1users)
   - [Get User Profile](#21-get-user-profile)
   - [Update Profile](#22-update-profile)
   - [Add Address](#23-add-address)
   - [Set Active Address](#24-set-active-address)
3. [Products (`/api/v1/products`)](#3-products-apiv1products)
   - [List Products](#31-list-products)
   - [Get Product by ID (with Variants, Colors & Sizes)](#32-get-product-by-id)
   - [Get Product by Slug](#33-get-product-by-slug)
   - [Create Product with R2 Image Upload (Admin)](#34-create-product-with-r2-image-upload-admin)
   - [Upload Images to Product (Admin)](#35-upload-images-to-product-admin)
   - [Remove Image from Product & R2 (Admin)](#36-remove-image-from-product--r2-admin)
   - [Update Product (Admin)](#37-update-product-admin)
   - [Delete Product & Purge R2 Assets (Admin)](#38-delete-product--purge-r2-assets-admin)
   - [Add Product Variant (Admin)](#39-add-product-variant-admin)
   - [Update Product Variant (Admin)](#310-update-product-variant-admin)
   - [Toggle / Set Variant Publish Status (Admin)](#311-toggle--set-variant-publish-status-admin)
   - [Delete Product Variant (Admin)](#312-delete-product-variant-admin)
4. [Categories (`/api/v1/categories`)](#4-categories-apiv1categories)
   - [List Categories](#41-list-all-categories)
   - [Get Category by ID](#42-get-category-by-id)
   - [Create Category (Admin)](#43-create-category-admin)
5. [Cart (`/api/v1/cart`)](#5-cart-apiv1cart)
   - [Get User Cart](#51-get-cart-items)
   - [Add Item to Cart](#52-add-item-to-cart)
   - [Remove Item from Cart](#53-remove-item-from-cart)
6. [Orders (`/api/v1/orders`)](#6-orders-apiv1orders)
   - [Get My Orders](#61-get-user-orders)
   - [Create Order](#62-create-order)
   - [Get Single Order](#63-get-order-by-id)
   - [Get All Orders (Admin)](#64-get-all-orders-admin)
7. [Payments (`/api/v1/payments`)](#7-payments-apiv1payments)
   - [Create Payment Intent](#71-create-payment-intent)
8. [Uploads / R2 Storage (`/api/v1/uploads`)](#8-uploads--r2-storage-apiv1uploads)
   - [Generate Pre-signed Upload URL](#81-generate-presigned-upload-url)
   - [Direct File Upload to Cloudflare R2](#82-direct-file-upload-to-cloudflare-r2)
   - [Delete File from Cloudflare R2](#83-delete-file-from-cloudflare-r2)
9. [System / Health](#9-system--health)
   - [Health Check](#91-health-check)

---

## 🔒 Authentication Header
Protected routes require the Bearer token in the `Authorization` HTTP header:
```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

---

## 1. Authentication (`/api/v1/auth`)

### 1.1 Register User
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/register`
- **Auth Required**: No

#### Request Headers
```http
Content-Type: application/json
```

#### Request Payload
```json
{
  "name": "Arjun Sivadas",
  "email": "arjun@gmail.com",
  "password": "Password@123",
  "phoneNumber": "+91 80863 88058",
  "role": "customer"
}
```
*Note: `phoneNumber` and `role` are optional (`role` defaults to `"customer"`, or can be `"admin"`).*

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "f5121b1c-e9ea-4a22-a972-02703aa4af43",
      "name": "Arjun Sivadas",
      "email": "arjun@gmail.com",
      "role": "customer",
      "createdAt": "2026-10-14T08:13:58.678Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### cURL Example
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Arjun Sivadas",
    "email": "arjun@gmail.com",
    "password": "Password@123",
    "phoneNumber": "+91 80863 88058",
    "role": "customer"
  }'
```

---

### 1.2 Login User
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/login`
- **Auth Required**: No

#### Request Payload
```json
{
  "email": "arjun@gmail.com",
  "password": "Password@123"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "id": "f5121b1c-e9ea-4a22-a972-02703aa4af43",
      "name": "Arjun Sivadas",
      "email": "arjun@gmail.com",
      "role": "customer",
      "avatarUrl": null,
      "address": []
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### cURL Example
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "arjun@gmail.com",
    "password": "Password@123"
  }'
```

---

### 1.3 Get Current User (`auth/me`)
- **Method**: `GET`
- **Endpoint**: `/api/v1/auth/me`
- **Auth Required**: Yes (`Bearer <token>`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "User profile fetched successfully",
  "data": {
    "user": {
      "id": "f5121b1c-e9ea-4a22-a972-02703aa4af43",
      "email": "arjun@gmail.com",
      "role": "customer"
    }
  }
}
```

---

## 2. Users & Address Management (`/api/v1/users`)

### 2.1 Get User Profile
- **Method**: `GET`
- **Endpoint**: `/api/v1/users/profile`
- **Auth Required**: Yes

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "5978b674-0ae8-458c-921c-77a4cd867ab5",
    "name": "Rahul Sharma",
    "email": "rahul@stylefox.com",
    "role": "customer",
    "phoneNumber": "+919876543211",
    "whatsappNumber": null,
    "avatarUrl": null,
    "address": [
      {
        "address": {
          "tag": "Home",
          "fullName": "Rahul Sharma",
          "phone": "+91 98765 43211",
          "street": "Flat 402, Skyline Luxury Apartments, MG Road",
          "city": "Bengaluru",
          "state": "Karnataka",
          "pincode": "560001"
        },
        "ActiveAddress": true
      }
    ],
    "createdAt": "2026-10-14T08:48:55.661Z"
  }
}
```

---

### 2.2 Update Profile
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/users/profile`
- **Auth Required**: Yes

#### Request Payload
```json
{
  "name": "Rahul S",
  "phoneNumber": "+91 98765 43211",
  "whatsappNumber": "+91 98765 43211",
  "avatarUrl": "https://assets.stylefox.com/avatars/avatar1.png"
}
```

---

### 2.3 Add Address
- **Method**: `POST`
- **Endpoint**: `/api/v1/users/address`
- **Auth Required**: Yes

#### Request Payload
```json
{
  "address": {
    "tag": "Work",
    "fullName": "Rahul Sharma",
    "phone": "+91 98765 43211",
    "street": "Level 5, Cyber Park, Electronic City Phase 1",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560100"
  },
  "ActiveAddress": false
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Address added successfully",
  "data": { ... }
}
```

---

### 2.4 Set Active Address
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/users/address/active`
- **Auth Required**: Yes

#### Request Payload
```json
{
  "index": 1
}
```
*Note: Sets the address at index `1` to `ActiveAddress: true` and marks all other addresses `false`.*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Active address updated successfully",
  "data": { ... }
}
```

---

## 3. Products (`/api/v1/products`)

### 3.1 List Products
- **Method**: `GET`
- **Endpoint**: `/api/v1/products`
- **Auth Required**: No

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `categoryId` | `string` | No | Filter by category UUID |
| `search` | `string` | No | Case-insensitive title search |
| `limit` | `number` | No | Maximum items (default: `20`) |

#### Example Request
`GET /api/v1/products?search=hoodie&limit=10`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": "5889a877-fba0-4784-babc-c49f900ea8c4",
      "name": "Oversized Streetwear Hoodie",
      "slug": "oversized-streetwear-hoodie",
      "tagline": "Heavyweight Relaxed Urban Silhouette",
      "description": "Heavyweight cotton blend hoodie with relaxed dropped-shoulder silhouette.",
      "rating": "4.8",
      "reviewCount": 142,
      "features": [
        "Heavyweight 400 GSM French Terry Cotton",
        "Double-layered structured hood without drawstrings",
        "Kangaroo front pouch with concealed stash pocket",
        "Pre-shrunk fabric to preserve boxy proportions"
      ],
      "categoryId": "b00d0259-2384-4502-95d8-f3280315b564",
      "createdAt": "2026-10-14T08:13:44.981Z",
      "updatedAt": "2026-10-14T08:13:44.981Z"
    }
  ]
}
```

---

### 3.2 Get Product by ID
- **Method**: `GET`
- **Endpoint**: `/api/v1/products/:id`
- **Auth Required**: No
- **Path Parameter**: `:id` — Product UUID

#### Success Response (`200 OK`)
*(Returns product with joined **Variants**, **Colors**, and **Sizes**)*
```json
{
  "success": true,
  "data": {
    "id": "5889a877-fba0-4784-babc-c49f900ea8c4",
    "name": "Oversized Streetwear Hoodie",
    "slug": "oversized-streetwear-hoodie",
    "tagline": "Heavyweight Relaxed Urban Silhouette",
    "description": "Heavyweight cotton blend hoodie...",
    "rating": "4.8",
    "reviewCount": 142,
    "features": [
      "Heavyweight 400 GSM French Terry Cotton",
      "Double-layered structured hood"
    ],
    "categoryId": "b00d0259-2384-4502-95d8-f3280315b564",
    "variants": [
      {
        "id": "391fc517-4107-46ab-87bb-04661f11ea87",
        "sku": "SF-OVERSI-MID-XS",
        "price": "59.99",
        "stock": 15,
        "images": ["https://images.unsplash.com/..."],
        "color": {
          "id": "13bd0238-c7c3-46d8-ba7b-6dffa663014e",
          "name": "Midnight Black",
          "hexCode": "#0a0a0a"
        },
        "size": {
          "id": "cd92c76e-3096-4db9-8a29-eae961aff1a9",
          "name": "Extra Small",
          "code": "XS"
        }
      }
    ]
  }
}
```

---

### 3.3 Get Product by Slug
- **Method**: `GET`
- **Endpoint**: `/api/v1/products/slug/:slug`
- **Auth Required**: No
- **Path Parameter**: `:slug` — Product URL slug (e.g., `oversized-streetwear-hoodie`)

---

### 3.4 Create Product with R2 Image Upload (Admin)
Creates a new product and **automatically uploads product images directly to Cloudflare R2**.
Supports both **`multipart/form-data`** (for file uploads) and **`application/json`** (with base64 or pre-signed URLs).

- **Method**: `POST`
- **Endpoint**: `/api/v1/products`
- **Auth Required**: Yes (`role: "admin"`)

#### Option A: `multipart/form-data` (Recommended for File Uploads)
Directly attach product image files (`.jpg`, `.png`, `.webp`). Images will be uploaded to Cloudflare R2 under `products/<timestamp>-<uuid>.<ext>` and assigned to the product & default variant.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` (Required) | Product name (e.g. `"Oversized Streetwear Hoodie"`) |
| `images` or `image` | `File` (Optional, multiple) | Product image files uploaded to Cloudflare R2 |
| `slug` | `string` (Optional) | Custom URL slug (auto-generated if omitted) |
| `tagline` | `string` (Optional) | Short product subtitle |
| `description` | `string` (Optional) | Full product description |
| `price` | `string`/`number` (Optional) | Price for the default variant (e.g. `59.99`) |
| `stock` | `number` (Optional) | Inventory count (default: `0`) |
| `features` | `string`/`array` (Optional) | Feature list (JSON array string or multiple fields) |
| `categoryId` | `string` (Optional) | Category UUID |
| `colorId` | `string` (Optional) | Initial color UUID |
| `sizeId` | `string` (Optional) | Initial size UUID |

##### cURL Example (Multipart File Upload to R2)
```bash
curl -X POST http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -F "name=Heavyweight Vintage Hoodie" \
  -F "price=79.99" \
  -F "stock=30" \
  -F "tagline=400 GSM French Terry" \
  -F "images=@/path/to/hoodie-front.jpg" \
  -F "images=@/path/to/hoodie-back.jpg" \
  -F "features=[\"100% Combed Cotton\", \"Double Layer Hood\"]"
```

#### Option B: `application/json` (Payload with R2 URLs or Base64)
```json
{
  "name": "Heavyweight Graphic Tee",
  "slug": "heavyweight-graphic-tee",
  "tagline": "Vintage Washed Architectural Boxy Cut",
  "description": "300 GSM dense jersey tee crafted for structured drape.",
  "price": "49.99",
  "stock": 25,
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "https://assets.stylefox.com/products/existing-image.jpg"
  ],
  "features": [
    "300 GSM compact combed cotton",
    "Thick 1.25 inch rib knit collar"
  ],
  "categoryId": "b00d0259-2384-4502-95d8-f3280315b564"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Product created and images uploaded to R2 successfully",
  "data": {
    "id": "3154fbad-fabf-4fd2-9a1a-bbbd530fffd4",
    "name": "Heavyweight Vintage Hoodie",
    "slug": "heavyweight-vintage-hoodie",
    "tagline": "400 GSM French Terry",
    "description": "Heavyweight cotton...",
    "rating": "0.0",
    "reviewCount": 0,
    "images": [
      "https://assets.stylefox.com/products/1792261649610-5530b895-86b4-47e8-9b1c-1492ca45a11e.jpg",
      "https://assets.stylefox.com/products/1792261649610-e972abe3-0bf5-45ad-8118-c663e8584880.jpg"
    ],
    "features": ["100% Combed Cotton", "Double Layer Hood"],
    "categoryId": null,
    "variants": [
      {
        "id": "c85d710b-8d02-4fc8-9f17-f58c73491cba",
        "sku": "SF-HEAVYW-4961",
        "price": "79.99",
        "stock": 30,
        "images": [
          "https://assets.stylefox.com/products/1792261649610-5530b895-86b4-47e8-9b1c-1492ca45a11e.jpg",
          "https://assets.stylefox.com/products/1792261649610-e972abe3-0bf5-45ad-8118-c663e8584880.jpg"
        ]
      }
    ]
  }
}
```

---

### 3.5 Upload Images to Product (Admin)
Upload additional images to an existing product. Uploads files to Cloudflare R2 and appends them to the product and variants.

- **Method**: `POST`
- **Endpoint**: `/api/v1/products/:id/images`
- **Auth Required**: Yes (`role: "admin"`)
- **Content-Type**: `multipart/form-data`

##### Form Data Fields
- `image` or `images`: One or more image files.

##### cURL Example
```bash
curl -X POST http://localhost:8000/api/v1/products/3154fbad-fabf-4fd2-9a1a-bbbd530fffd4/images \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -F "images=@/path/to/hoodie-side-view.jpg"
```

---

### 3.6 Remove Image from Product & R2 (Admin)
Removes an image URL from the product and deletes the underlying object from Cloudflare R2 storage.

- **Method**: `DELETE`
- **Endpoint**: `/api/v1/products/:id/images`
- **Auth Required**: Yes (`role: "admin"`)

#### Request Payload
```json
{
  "imageUrl": "https://assets.stylefox.com/products/1792261649610-5530b895-86b4-47e8-9b1c-1492ca45a11e.jpg"
}
```

---

### 3.7 Update Product (Admin)
- **Method**: `PUT`
- **Endpoint**: `/api/v1/products/:id`
- **Auth Required**: Yes (`role: "admin"`)
- **Request Payload**: Partial fields from Create Product (supports JSON or multipart form-data with additional image files).

---

### 3.8 Delete Product & Purge R2 Assets (Admin)
Deletes product, cascades variants, and purges all associated product images from Cloudflare R2.

- **Method**: `DELETE`
- **Endpoint**: `/api/v1/products/:id`
- **Auth Required**: Yes (`role: "admin"`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Product deleted successfully and R2 assets cleaned up"
}
```

---

### 3.9 Add Product Variant (Admin)
Creates and links a new variant with pricing, inventory, colors, sizes, and **`isPublished` boolean status** to an existing product.

- **Method**: `POST`
- **Endpoint**: `/api/v1/products/:id/variants`
- **Auth Required**: Yes (`role: "admin"`)

#### Request Payload
```json
{
  "sku": "SF-HOODIE-BLK-M",
  "price": "69.99",
  "stock": 25,
  "colorId": "13bd0238-c7c3-46d8-ba7b-6dffa663014e",
  "sizeId": "cd92c76e-3096-4db9-8a29-eae961aff1a9",
  "images": [
    "https://assets.stylefox.com/products/1792261649610-hoodie-front.jpg"
  ],
  "isPublished": true
}
```
*(Supports either `"isPublished": true/false` or `"published": true/false`)*

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Variant added successfully",
  "data": {
    "id": "e2f132e4-96d5-4ad9-bf95-5cb954a613be",
    "productId": "3154fbad-fabf-4fd2-9a1a-bbbd530fffd4",
    "sku": "SF-HOODIE-BLK-M",
    "price": "69.99",
    "stock": 25,
    "images": ["https://assets.stylefox.com/products/1792261649610-hoodie-front.jpg"],
    "isPublished": true,
    "createdAt": "2026-10-18T00:45:00.000Z",
    "updatedAt": "2026-10-18T00:45:00.000Z"
  }
}
```

---

### 3.10 Update Product Variant (Admin)
Updates any variant field, including pricing, stock, images, and **`isPublished` boolean status**.

- **Method**: `PUT`
- **Endpoint**: `/api/v1/products/variants/:variantId`
- **Auth Required**: Yes (`role: "admin"`)

#### Request Payload
```json
{
  "price": "59.99",
  "stock": 40,
  "isPublished": false
}
```

---

### 3.11 Toggle / Set Variant Publish Status (Admin)
Convenient endpoint to toggle a variant's published status or explicitly set it.

- **Method**: `PATCH`
- **Endpoint**: `/api/v1/products/variants/:variantId/publish`
- **Auth Required**: Yes (`role: "admin"`)

#### Optional Request Payload
```json
{
  "isPublished": false
}
```
*(If request body is empty, it toggles the current boolean value between `true` and `false`)*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Variant publish status set to false",
  "data": {
    "id": "e2f132e4-96d5-4ad9-bf95-5cb954a613be",
    "sku": "SF-HOODIE-BLK-M",
    "isPublished": false,
    "updatedAt": "2026-10-18T00:46:00.000Z"
  }
}
```

---

### 3.12 Delete Product Variant (Admin)
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/products/variants/:variantId`
- **Auth Required**: Yes (`role: "admin"`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Variant deleted successfully"
}
```

---

## 4. Categories (`/api/v1/categories`)

### 4.1 List All Categories
- **Method**: `GET`
- **Endpoint**: `/api/v1/categories`
- **Auth Required**: No

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Categories fetched successfully",
  "data": [
    {
      "id": "b00d0259-2384-4502-95d8-f3280315b564",
      "name": "Men's Collection",
      "slug": "mens-collection",
      "description": "Modern menswear and urban styles",
      "imageUrl": null,
      "createdAt": "2026-10-14T08:13:44.978Z",
      "updatedAt": "2026-10-14T08:13:44.978Z"
    }
  ]
}
```

---

### 4.2 Get Category by ID
- **Method**: `GET`
- **Endpoint**: `/api/v1/categories/:id`
- **Auth Required**: No

---

### 4.3 Create Category (Admin)
- **Method**: `POST`
- **Endpoint**: `/api/v1/categories`
- **Auth Required**: Yes (`role: "admin"`)

#### Request Payload
```json
{
  "name": "Outerwear & Jackets",
  "slug": "outerwear-jackets",
  "description": "Streetwear parkas, bombers, and work jackets",
  "imageUrl": "https://assets.stylefox.com/categories/jackets.jpg"
}
```

---

## 5. Cart (`/api/v1/cart`)

### 5.1 Get Cart Items
- **Method**: `GET`
- **Endpoint**: `/api/v1/cart`
- **Auth Required**: Yes

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Cart items fetched successfully",
  "data": [
    {
      "id": "cart-item-uuid",
      "productId": "5889a877-fba0-4784-babc-c49f900ea8c4",
      "quantity": 2,
      "selectedSize": "L",
      "selectedColor": "Midnight Black",
      "product": { ... }
    }
  ]
}
```

---

### 5.2 Add Item to Cart
- **Method**: `POST`
- **Endpoint**: `/api/v1/cart`
- **Auth Required**: Yes

#### Request Payload
```json
{
  "productId": "5889a877-fba0-4784-babc-c49f900ea8c4",
  "quantity": 1,
  "selectedSize": "XL",
  "selectedColor": "Washed Charcoal"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": { ... }
}
```

---

### 5.3 Remove Item from Cart
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/cart/:id`
- **Auth Required**: Yes
- **Path Parameter**: `:id` — Cart Item UUID

---

## 6. Orders (`/api/v1/orders`)

### 6.1 Get User Orders
- **Method**: `GET`
- **Endpoint**: `/api/v1/orders`
- **Auth Required**: Yes

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Orders fetched successfully",
  "data": [ ... ]
}
```

---

### 6.2 Create Order
- **Method**: `POST`
- **Endpoint**: `/api/v1/orders`
- **Auth Required**: Yes

#### Request Payload
```json
{
  "totalAmount": "119.98",
  "items": [
    {
      "productId": "5889a877-fba0-4784-babc-c49f900ea8c4",
      "productName": "Oversized Streetwear Hoodie",
      "price": 59.99,
      "quantity": 2,
      "size": "L",
      "color": "Midnight Black",
      "image": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80"
    }
  ],
  "shippingAddress": {
    "fullName": "Rahul Sharma",
    "phone": "+91 98765 43211",
    "addressLine1": "Flat 402, Skyline Luxury Apartments, MG Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postalCode": "560001",
    "country": "India"
  },
  "paymentMethod": "cod"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "id": "order-uuid-here",
    "status": "pending",
    "totalAmount": "119.98",
    "paymentStatus": "unpaid",
    "paymentMethod": "cod",
    "createdAt": "2026-10-15T08:00:00.000Z"
  }
}
```

---

### 6.3 Get Order by ID
- **Method**: `GET`
- **Endpoint**: `/api/v1/orders/:id`
- **Auth Required**: Yes

---

### 6.4 Get All Orders (Admin)
- **Method**: `GET`
- **Endpoint**: `/api/v1/orders/admin/all`
- **Auth Required**: Yes (`role: "admin"`)

---

## 7. Payments (`/api/v1/payments`)

### 7.1 Create Payment Intent
- **Method**: `POST`
- **Endpoint**: `/api/v1/payments/create-intent`
- **Auth Required**: Yes

#### Request Payload
```json
{
  "orderId": "order-uuid-here",
  "amount": 119.98
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Payment intent created",
  "data": {
    "orderId": "order-uuid-here",
    "amount": 119.98,
    "currency": "INR",
    "clientSecret": "mock_secret_order-uuid-here_1792034000000",
    "status": "intent_created"
  }
}
```

---

## 8. Uploads / R2 Storage (`/api/v1/uploads`)

### 8.1 Generate Pre-signed Upload URL
Generates a pre-signed Cloudflare R2 upload URL for secure direct uploads from browser/app.

- **Method**: `POST`
- **Endpoint**: `/api/v1/uploads/presigned-url`
- **Auth Required**: Yes

#### Request Payload
```json
{
  "fileName": "my-hoodie-front.jpg",
  "contentType": "image/jpeg",
  "folder": "products"
}
```
*`folder` options: `"products"`, `"avatars"`, `"categories"`, `"banners"`.*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Pre-signed upload URL generated successfully",
  "data": {
    "uploadUrl": "https://<account-id>.r2.cloudflarestorage.com/stylefox-assets/products/...",
    "publicUrl": "https://assets.stylefox.com/products/1792034000000-uuid.jpg",
    "key": "products/1792034000000-uuid.jpg"
  }
}
```

---

### 8.2 Direct File Upload to Cloudflare R2
Upload one or more files directly through the backend to Cloudflare R2 without generating presigned URLs manually.

- **Method**: `POST`
- **Endpoint**: `/api/v1/uploads/direct`
- **Auth Required**: Yes
- **Content-Type**: `multipart/form-data`

#### Form Data Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `file` or `images` | `File` (Required) | The file(s) to upload |
| `folder` | `string` (Optional) | Target folder: `"products"`, `"avatars"`, `"categories"`, `"banners"` (default: `"products"`) |

##### cURL Example
```bash
curl -X POST http://localhost:8000/api/v1/uploads/direct \
  -H "Authorization: Bearer <TOKEN>" \
  -F "folder=products" \
  -F "file=@/path/to/product-image.jpg"
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "File(s) uploaded successfully to Cloudflare R2",
  "data": {
    "fileName": "product-image.jpg",
    "contentType": "image/jpeg",
    "size": 154200,
    "key": "products/1792261649610-5530b895-86b4-47e8-9b1c-1492ca45a11e.jpg",
    "url": "https://assets.stylefox.com/products/1792261649610-5530b895-86b4-47e8-9b1c-1492ca45a11e.jpg"
  }
}
```

---

### 8.3 Delete File from Cloudflare R2
Removes a stored object from Cloudflare R2 by key or public URL.

- **Method**: `DELETE`
- **Endpoint**: `/api/v1/uploads`
- **Auth Required**: Yes

#### Request Payload
```json
{
  "key": "products/1792261649610-5530b895-86b4-47e8-9b1c-1492ca45a11e.jpg"
}
```
*(or specify `"url": "https://assets.stylefox.com/products/..."`)*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "File deleted from Cloudflare R2 successfully",
  "data": null
}
```

---

## 9. System / Health

### 9.1 Health Check
- **Method**: `GET`
- **Endpoint**: `/health`
- **Auth Required**: No

#### Success Response (`200 OK`)
```json
{
  "status": "ok",
  "service": "StyleFox API",
  "timestamp": "2026-10-15T03:15:00.000Z"
}
```

---

## ⚠️ Standard Error Responses

All API errors return a standard JSON structure:

```json
{
  "success": false,
  "message": "Error description here",
  "error": [ ... ]
}
```

| HTTP Code | Description |
| :--- | :--- |
| `400 Bad Request` | Validation failure (e.g., missing or invalid fields) |
| `401 Unauthorized` | Missing, invalid, or expired JWT token |
| `403 Forbidden` | Requires higher role (e.g., admin) |
| `404 Not Found` | Requested resource does not exist |
| `500 Server Error` | Unhandled server exception |
