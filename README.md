# Catalogue Backend

## Overview

A Node.js and Express backend for a catalogue application. It connects to MongoDB and currently provides an API for reading active categories as a three-level navigation menu.

## Technologies Used

- Node.js
- Express
- MongoDB
- Mongoose
- dotenv
- Nodemon (development)

## Installation

1. Clone the repository and open the project directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure the environment variables as described below.
4. Start MongoDB.
5. Start the application:

   ```bash
   npm start
   ```

   For development with automatic restarts:

   ```bash
   npm run dev
   ```

The server runs on port `5000` by default. Set `PORT` in `.env` to use a different port.

## Environment Configuration

Create a `.env` file in the project root with the following value:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/catalogue
```

Optionally, configure the server port:

```env
PORT=5000
```

## MongoDB Configuration

The application connects through Mongoose using `MONGODB_URI`. The configured database name is `catalogue`.

For a local MongoDB instance, use:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/catalogue
```

## Project Structure

```text
ecommerce-backend/
|-- config/
|   `-- db.js
|-- controllers/
|   `-- menuController.js
|-- models/
|   `-- Category.js
|-- routes/
|   `-- menuRoutes.js
|-- .env
|-- package.json
|-- package-lock.json
|-- README.md
`-- server.js
```

## Implemented Features

- MongoDB connection using Mongoose.
- Category model with name, slug, parent category, level, and status fields.
- Three-level category hierarchy support:
  - Level 1 categories have `parentId: null`.
  - Level 2 categories reference a Level 1 category.
  - Level 3 categories reference a Level 2 category.
- Navigation menu API that returns active categories in a nested structure.

## API Documentation

### Get Menu

Returns all active categories as a nested navigation menu. The API groups each category under its parent so clients can render a three-level catalogue menu.

| Item | Value |
| --- | --- |
| HTTP method | `GET` |
| URL | `/api/menu` |

#### Three-level hierarchy

- Level 1 is a top-level category with `parentId: null`.
- Level 2 is a child of a Level 1 category.
- Level 3 is a child of a Level 2 category.

Each category has a `children` array. Level 1 `children` contain Level 2 categories, and Level 2 `children` contain Level 3 categories. Level 3 categories have an empty `children` array.

#### Response structure

The API responds with a `success` flag and a `data` array of Level 1 categories. Every returned category includes its stored category fields plus a `children` array.

```text
data[]
  `-- Level 1 category
      `-- children[]: Level 2 categories
          `-- children[]: Level 3 categories
```

```http
GET /api/menu
```

#### Example response

```json
{
  "success": true,
  "data": [
    {
      "_id": "category-id",
      "name": "Electronics",
      "slug": "electronics",
      "parentId": null,
      "level": 1,
      "status": "active",
      "children": [
        {
          "_id": "subcategory-id",
          "name": "Computers",
          "slug": "computers",
          "parentId": "category-id",
          "level": 2,
          "status": "active",
          "children": [
            {
              "_id": "child-category-id",
              "name": "Laptops",
              "slug": "laptops",
              "parentId": "subcategory-id",
              "level": 3,
              "status": "active",
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

## Testing

There are no automated tests configured yet. After adding active category records to MongoDB, test the current API manually:

```bash
curl http://localhost:5000/api/menu
```

### Create Product

Creates a product, its attributes, and its category mappings in a single database transaction.

| Item | Value |
| --- | --- |
| HTTP method | `POST` |
| URL | `/api/products` |

#### Request body

```json
{
  "name": "Nike Air Max",
  "sku": "NIKE-AM-100",
  "description": "Men's running shoes",
  "price": 8999,
  "stock": 20,
  "image": "nike-air-max.jpg",
  "attributes": [
    {
      "attributeCode": "color",
      "attributeValue": "Black"
    }
  ],
  "categoryIds": ["CATEGORY_ID_1", "CATEGORY_ID_2"]
}
```

#### Success response

Returns `201 Created` with the new `product`, `attributes`, and mapped `categories`.

```json
{
  "success": true,
  "product": { "_id": "product-id", "name": "Nike Air Max" },
  "attributes": [
    { "attributeCode": "color", "attributeValue": "Black" }
  ],
  "categories": [{ "_id": "category-id", "name": "Sneakers" }]
}
```

#### Validation and errors

- `name`, `sku`, and a numeric `price` greater than or equal to `0` are required.
- `stock` must be numeric and greater than or equal to `0`; it defaults to `0`.
- `categoryIds` must be an array of valid ObjectIds for existing active categories. Duplicate IDs are removed before mappings are created.
- `attributes`, when provided, must be an array. Each entry needs a unique, non-empty `attributeCode` and non-empty `attributeValue`.
- A duplicate SKU returns `409`.
- Invalid input or inactive/missing categories return `400`.

If any write fails, the transaction is rolled back, so no partial product, attribute, or mapping data is retained.

### Create Product Variant

Creates a variant for an existing active product.

| Item | Value |
| --- | --- |
| HTTP method | `POST` |
| URL | `/api/products/:productId/variants` |

#### Request body

```json
{
  "sku": "TSHIRT-M-BLACK",
  "price": 1299,
  "stock": 20,
  "image": "black-shirt.jpg",
  "status": "active"
}
```

#### Success response

Returns `201 Created` with the new product variant.

```json
{
  "success": true,
  "productVariant": {
    "_id": "product-variant-id",
    "productId": "PRODUCT_ID",
    "sku": "TSHIRT-M-BLACK",
    "price": 1299,
    "stock": 20,
    "image": "black-shirt.jpg",
    "status": "active",
    "createdAt": "2026-09-15T00:00:00.000Z",
    "updatedAt": "2026-09-15T00:00:00.000Z"
  }
}
```

#### Validation and errors

- `productId` must be a valid MongoDB ObjectId for an existing active product. An invalid ID returns `400`; a missing or inactive product returns `404`.
- `sku` is required and must be unique across product variants. A duplicate SKU returns `409`.
- `price` is required and must be a finite number greater than or equal to `0`.
- `stock` defaults to `0` and must be a finite number greater than or equal to `0`.
- `image`, when provided, must be a string.
- `status` defaults to `active` and must be either `active` or `inactive`.

### List Product Variants

Returns all active variants for an existing product.

| Item | Value |
| --- | --- |
| HTTP method | `GET` |
| URL | `/api/products/:productId/variants` |

#### Success response

Returns `200 OK`. Inactive variants are excluded.

```json
{
  "success": true,
  "productVariants": [
    {
      "_id": "PRODUCT_VARIANT_ID",
      "productId": "PRODUCT_ID",
      "sku": "TSHIRT-M-BLACK",
      "price": 1299,
      "stock": 20,
      "image": "black-shirt.jpg",
      "status": "active",
      "createdAt": "2026-09-15T00:00:00.000Z",
      "updatedAt": "2026-09-15T00:00:00.000Z"
    }
  ]
}
```

#### Validation and errors

- `400` â€” `productId` is not a valid MongoDB ObjectId.
- `404` â€” the product does not exist.

### Get Single Product Variant

Returns one variant only when it belongs to the specified product.

| Item | Value |
| --- | --- |
| HTTP method | `GET` |
| URL | `/api/products/:productId/variants/:variantId` |

#### Success response

Returns `200 OK` with the requested product variant.

```json
{
  "success": true,
  "productVariant": {
    "_id": "PRODUCT_VARIANT_ID",
    "productId": "PRODUCT_ID",
    "sku": "TSHIRT-M-BLACK",
    "price": 1299,
    "stock": 20,
    "image": "black-shirt.jpg",
    "status": "active",
    "createdAt": "2026-09-15T00:00:00.000Z",
    "updatedAt": "2026-09-15T00:00:00.000Z"
  }
}
```

#### Validation and errors

- `400` - `productId` or `variantId` is not a valid MongoDB ObjectId.
- `404` - the product does not exist, or no variant belongs to that product with the requested `variantId`.

### Get Product by ID

Returns a product with its attributes, categories, and active images. Images are ordered with the primary image first, then by `sortOrder` ascending.

| Item | Value |
| --- | --- |
| HTTP method | `GET` |
| URL | `/api/products/:id` |

#### Success response

```json
{
  "success": true,
  "product": {
    "_id": "PRODUCT_ID",
    "name": "Nike Air Max",
    "sku": "NIKE-AM-100",
    "price": 2499,
    "stock": 12,
    "status": "active",
    "attributes": [
      { "attributeCode": "color", "attributeValue": "Black" }
    ],
    "categories": [
      { "_id": "CATEGORY_ID", "name": "Sneakers" }
    ],
    "images": [
      {
        "_id": "PRODUCT_IMAGE_ID",
        "imageUrl": "https://placehold.co/1200x1200/png?text=Nike+Air+Max+Primary",
        "altText": "Nike Air Max primary product image",
        "isPrimary": true,
        "sortOrder": 0
      }
    ]
  }
}
```

### Update Product

Updates a product and, when supplied, synchronizes its attributes and category mappings. Attributes and category IDs remain in their dedicated collections; they are not stored on the product document.

| Item | Value |
| --- | --- |
| HTTP method | `PUT` |
| URL | `/api/products/:id` |

#### Request body example

```json
{
  "name": "Nike Air Max 2026",
  "sku": "NIKE-AM-100",
  "price": 9499,
  "stock": 15,
  "status": "active",
  "attributes": [
    { "attributeCode": "color", "attributeValue": "Black" },
    { "attributeCode": "size", "attributeValue": "42" }
  ],
  "categoryIds": ["CATEGORY_ID_1", "CATEGORY_ID_2"]
}
```

All listed product fields are optional; only supplied fields are changed. Supplying `attributes` or `categoryIds` as an empty array removes all of that product's attributes or category mappings, respectively.

#### Success response

Returns `200 OK` with the updated product, its attribute records, and its active mapped category documents.

```json
{
  "success": true,
  "product": { "_id": "product-id", "name": "Nike Air Max 2026", "sku": "NIKE-AM-100", "price": 9499, "stock": 15, "status": "active" },
  "attributes": [
    { "attributeCode": "color", "attributeValue": "Black" },
    { "attributeCode": "size", "attributeValue": "42" }
  ],
  "categories": [
    { "_id": "CATEGORY_ID_1", "name": "Sneakers", "status": "active" }
  ]
}
```

#### Validation and errors

- An invalid product ID returns `400`; a valid ID with no product returns `404`.
- A supplied SKU may belong to the current product, but a SKU used by another product returns `409`.
- Supplied `price` and `stock` must be finite numbers greater than or equal to `0`.
- Supplied `categoryIds` must be an array of valid ObjectIds for existing active categories. Duplicate IDs are ignored.
- Supplied `attributes` must be an array. Every item requires a non-empty `attributeCode` and `attributeValue`; attribute codes must be unique for the product.

The operation runs in one MongoDB transaction when connected to a replica set or mongos: the product update, attribute synchronization, and category-mapping synchronization either all commit or all roll back. For a standalone MongoDB server, which does not support transaction numbers, the API automatically executes the same writes without a session so local development remains usable. Attribute synchronization deletes codes omitted from the request, updates values for retained codes, and creates new codes. Category synchronization removes omitted mappings, retains existing mappings, and inserts only new mappings.

### Delete Product (Soft Delete)

Deactivates a product without physically deleting its document or related records.

| Item | Value |
| --- | --- |
| HTTP method | `DELETE` |
| URL | `/api/products/:id` |

#### Request example

```http
DELETE /api/products/PRODUCT_ID
```

The request does not require a body.

#### Success response

```json
{
  "success": true,
  "message": "Product deactivated successfully",
  "product": {
    "id": "PRODUCT_ID",
    "name": "Nike Air Max",
    "status": "inactive"
  }
}
```

If the product is already inactive, the API returns `200 OK` with the message `Product is already inactive` and the same product summary.

#### Error responses

- `400` — invalid MongoDB product ID.
- `404` — product does not exist.

Soft delete only changes `Product.status` to `inactive`. The Product document, ProductAttribute records, and ProductCategory mappings are retained for historical and reference purposes.

### List and Filter Products

The existing product listing endpoint supports searching, filtering, sorting, and pagination.

```http
GET /api/products
```

Supported query parameters:

| Parameter | Description |
| --- | --- |
| `search` | Case-insensitive match against product `name` or `sku`. |
| `categoryId` | Filters through `ProductCategory`; must be a valid ObjectId. |
| `minPrice`, `maxPrice` | Numeric inclusive price bounds. |
| `inStock` | `true` for stock greater than zero, `false` for zero stock. |
| `status` | `active` or `inactive` (defaults to `active`). |
| `attributeCode`, `attributeValue` | Exact attribute match through `ProductAttribute`; provide both together. |
| `sortBy` | `name`, `price`, or `createdAt` (defaults to `createdAt`). |
| `sortOrder` | `asc` or `desc` (defaults to `desc`). |
| `page` | Integer greater than or equal to `1` (defaults to `1`). |
| `limit` | Integer from `1` through `100` (defaults to `10`). |

#### Examples

```http
GET /api/products?search=nike&minPrice=1000&maxPrice=5000&inStock=true&page=1&limit=20
GET /api/products?categoryId=CATEGORY_ID&attributeCode=color&attributeValue=Black
GET /api/products?status=inactive&sortBy=price&sortOrder=asc
```

#### Response structure

```json
{
  "success": true,
  "products": [
    {
      "_id": "PRODUCT_ID",
      "name": "Nike Air Max",
      "sku": "NIKE-AM-100",
      "price": 2499,
      "stock": 12,
      "status": "active",
      "attributes": [
        { "attributeCode": "color", "attributeValue": "Black" }
      ],
      "categories": [
        { "_id": "CATEGORY_ID", "name": "Sneakers" }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

Invalid page/limit values, unsupported sort fields or directions, invalid price values, invalid category IDs, invalid status/inStock values, and incomplete attribute filters return `400 Bad Request`. Category and attribute filtering queries their respective `ProductCategory` and `ProductAttribute` collections; neither relationship is duplicated in `Product`.

### Create Attribute Master

Creates an attribute definition for the catalogue.

| Item | Value |
| --- | --- |
| HTTP method | `POST` |
| URL | `/api/attributes` |

#### Request example

```json
{
  "name": "Color",
  "code": "COLOR",
  "type": "select",
  "values": ["Black", "White", "Blue"]
}
```

The code is normalized to lowercase (`color`). Supported types are `text`, `number`, `select`, `multiselect`, and `boolean`. `values` must be a non-empty array of strings for `select` and `multiselect`; it is optional for the other types.

#### Success response (`201 Created`)

```json
{
  "success": true,
  "attribute": {
    "_id": "ATTRIBUTE_ID",
    "name": "Color",
    "code": "color",
    "type": "select",
    "values": ["Black", "White", "Blue"],
    "status": "active"
  }
}
```

#### Validation and errors

- `400` is returned when `name` or `code` is missing, the type is unsupported, values are not an array of strings, or select/multiselect values are missing or empty.
- `409` is returned when the normalized attribute code already exists.

### Get Attribute Master by ID

Returns an Attribute Master record by its MongoDB ID.

| Item | Value |
| --- | --- |
| HTTP method | `GET` |
| URL | `/api/attributes/:id` |

#### Request example

```http
GET /api/attributes/66c9d5b4f2a3b4c5d6e7f8a9
```

#### Success response (`200 OK`)

```json
{
  "success": true,
  "attribute": {
    "_id": "66c9d5b4f2a3b4c5d6e7f8a9",
    "name": "Color",
    "code": "color",
    "type": "select",
    "values": ["Black", "White", "Blue"],
    "status": "active",
    "createdAt": "2026-08-24T10:00:00.000Z",
    "updatedAt": "2026-08-24T10:00:00.000Z"
  }
}
```

#### Error responses

Invalid MongoDB ObjectId (`400 Bad Request`):

```json
{
  "success": false,
  "message": "Invalid attribute ID"
}
```

Attribute not found (`404 Not Found`):

```json
{
  "success": false,
  "message": "Attribute not found"
}
```

### Update Attribute Master

Updates an Attribute Master by its MongoDB ID. `name` and `code` are required in the request; `type`, `values`, and `status` may be omitted to keep their current values.

| Item | Value |
| --- | --- |
| HTTP method | `PUT` |
| URL | `/api/attributes/:id` |

#### Request example

```http
PUT /api/attributes/66c9d5b4f2a3b4c5d6e7f8a9
Content-Type: application/json
```

```json
{
  "name": "Color",
  "code": "COLOR",
  "type": "select",
  "values": ["Black", "White", "Blue"],
  "status": "active"
}
```

#### Success response (`200 OK`)

```json
{
  "success": true,
  "attribute": {
    "_id": "66c9d5b4f2a3b4c5d6e7f8a9",
    "name": "Color",
    "code": "color",
    "type": "select",
    "values": ["Black", "White", "Blue"],
    "status": "active",
    "createdAt": "2026-08-24T10:00:00.000Z",
    "updatedAt": "2026-08-24T10:05:00.000Z"
  }
}
```

#### Validation rules

- `name` and `code` are required; `code` is normalized to lowercase and must be unique across other Attribute documents.
- `type` must be `text`, `number`, `select`, `multiselect`, or `boolean`.
- For `select` and `multiselect`, `values` must be a non-empty array of strings.
- For `text`, `number`, and `boolean`, `values` may be omitted or an empty array (when supplied, it must be an array of strings).

#### Error responses

```json
// 400 Bad Request: invalid ID, missing name/code, invalid type, or invalid values
{ "success": false, "message": "Invalid attribute ID" }

// 404 Not Found
{ "success": false, "message": "Attribute not found" }

// 409 Conflict: code already exists on another Attribute
{ "success": false, "message": "Attribute code already exists" }
```

### Delete Attribute Master (Soft Delete)

Deactivates an Attribute Master without physically deleting its document. Existing `ProductAttribute` records are not modified or deleted, so they remain available for historical and reference purposes.

| Item | Value |
| --- | --- |
| HTTP method | `DELETE` |
| URL | `/api/attributes/:id` |

#### Request example

```http
DELETE /api/attributes/66c9d5b4f2a3b4c5d6e7f8a9
```

The request does not require a body.

#### Success response (`200 OK`)

```json
{
  "success": true,
  "message": "Attribute deactivated successfully",
  "attribute": {
    "attributeId": "66c9d5b4f2a3b4c5d6e7f8a9",
    "name": "Color",
    "code": "color",
    "status": "inactive"
  }
}
```

If the attribute is already inactive, the API returns `200 OK` with the message `Attribute is already inactive` and the same attribute summary.

#### Error responses

```json
// 400 Bad Request
{ "success": false, "message": "Invalid attribute ID" }

// 404 Not Found
{ "success": false, "message": "Attribute not found" }
```

Soft delete only changes `Attribute.status` to `inactive`; the Attribute document remains in MongoDB and no `ProductAttribute` records are changed.

### List Attribute Masters

Returns active Attribute Master records with optional search, type filtering, sorting, and pagination.

```http
GET /api/attributes
```

Supported query parameters:

| Parameter | Description |
| --- | --- |
| `search` | Case-insensitive match against `name` or `code`. |
| `type` | Filters by attribute type, such as `select`. |
| `page` | Integer greater than or equal to `1`; defaults to `1`. |
| `limit` | Integer from `1` through `100`; defaults to `10`. |
| `sortBy` | `name` or `createdAt`; defaults to `createdAt`. |
| `sortOrder` | `asc` or `desc`; defaults to `desc`. |

#### Examples

```http
GET /api/attributes?search=color
GET /api/attributes?type=select&page=1&limit=20
GET /api/attributes?sortBy=name&sortOrder=asc
```

#### Response example

```json
{
  "success": true,
  "data": [
    {
      "_id": "ATTRIBUTE_ID",
      "name": "Color",
      "code": "color",
      "type": "select",
      "values": ["Black", "White"],
      "status": "active"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```
