# API Reference

This document describes the API endpoints.

## Endpoints

### GET /api/health

Returns the health status of the service.

**Response:**

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

### POST /api/docs

Create a new document.

!!! info "Authentication"
This endpoint requires authentication via Bearer token.

**Request Body:**

| Field     | Type    | Required | Description      |
| --------- | ------- | -------- | ---------------- |
| `title`   | string  | Yes      | Document title   |
| `content` | string  | Yes      | Markdown content |
| `draft`   | boolean | No       | Save as draft    |

**Example:**

```python
import requests

response = requests.post(
    "https://api.example.com/api/docs",
    headers={"Authorization": "Bearer TOKEN"},
    json={
        "title": "My Document",
        "content": "# Hello World"
    }
)
```
