[< Back](../../README.md)
# API Documentation

------------------------------------------------------------------------

## Authentication --- API Key

All secured endpoints require a valid **API Key**.

### How to Provide the API Key

You can attach the API Key to your request using **any** of the
following methods:

  Method   Location                Example
  -------- ----------------------- ---------------------------------------
  Header   `x-api-key`             `x-api-key: sk_test_12345`
  Header   `authorization`         `authorization: apikey sk_test_12345`
  Cookie   `apiKey` or `api_key`   `Cookie: apiKey=sk_test_12345`

If the API Key is missing, invalid, or expired, the server responds
with:

``` json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

Some endpoints are **public**, meaning they can be accessed without
authentication.



## Dishes API

Manage dishes displayed to customers.\
Routes are prefixed with `/api/v1/dishes`.



### `GET /api/v1/dishes`

**Description:**\
Retrieve a list of all dishes, optionally filtered by name or category.

**Query Parameters:** \| Name \| Type \| Optional \| Description \|
\|:------\|:------\|:-----------\|:-------------\| \| `name` \| string
\| ✅ \| Search dishes by name (case-insensitive). \| \| `category` \|
string \| ✅ \| Filter by category. Must be one of: `"appetizer"`,
`"main course"`, `"dessert"`, `"beverage"`, `"undefined"`. \|


**Successful Response:**

``` json
{
  "success": true,
  "data": [
    {
      "_id": "654c2e8b7c...",
      "name": "Grilled Salmon",
      "category": "main course",
      "description": "Fresh salmon with lemon butter sauce",
      "price": 168,
      
    }
  ]
}
```



### `GET /api/v1/dishes/:dishId`

**Description:**\
Retrieve details of a specific dish by its ID.

**Path Parameters:** \| Name \| Type \| Required \| Description \|
\|:------\|:------\|:-----------\|:-------------\| \| `dishId` \| string
\| ✅ \| MongoDB ObjectId of the dish. \|

**Successful Response:**

``` json
{
  "success": true,
  "data": {
    "_id": "654c2e8b7c...",
    "name": "Grilled Salmon",
    "category": "main course",
    "description": "Fresh salmon with lemon butter sauce",
    "price": 168,
  }
}
```

**Error Responses:** - `400 Bad Request` --- Missing or invalid
`dishId` - `404 Not Found` --- Dish not found


### `POST /api/v1/dishes`

**Authentication Required:** ✅ (Admin only)

**Description:**\
Create a new dish.

**Headers:**

    x-api-key: <your_api_key>

**Request Body:** \| Field \| Type \| Required \| Description \|
\|:------\|:------\|:-----------\|:-------------\| \| `name` \| string
\| ✅ \| Dish name (min length: 2). \| \| `category` \| string \| ❌ \|
Category, defaults to `"undefined"`. \| \| `description` \| string \| ❌
\| Optional description. \| \| `price` \| number \| ✅ \| Dish price
(must be positive). \| \| `image` \| string (URL) \| ❌ \| Optional
image URL. \|

**Successful Response:**

``` json
{
  "success": true,
  "data": {
    "_id": "6550123abc...",
    "name": "Matcha Cheesecake",
    "category": "dessert",
    "price": 58,
    "description": "Rich cheesecake with Japanese matcha flavor",
  }
}
```

**Error Responses:** - `401 Unauthorized` --- Invalid or missing API
Key\
- `403 Forbidden` --- User is not admin\
- `400 Bad Request` --- Invalid payload fields


## Error Format

All errors follow a unified structure:

``` json
{
  "error": "Bad Request",
  "message": "dishId is required"
}
```

  Field       Description
  ----------- ----------------------
  `error`     Short error type
  `message`   Detailed explanation


## Future Modules (To Be Documented)

  -----------------------------------------------------------------------
  Module               Status               Description
  -------------------- -------------------- -----------------------------
  `/api/v1/staff`      🔜                   Staff management (Admin only)

  `/api/v1/orders`     🔜                   Customer order creation,
                                            update, and tracking

  `/api/v1/apikeys`    🔜                   API Key generation and
                                            management
  -----------------------------------------------------------------------

------------------------------------------------------------------------
