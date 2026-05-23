# Product Image Upload

## Admin product image model

- **Maximum images**: up to 4 images per product.
- **Supported formats**: JPG, PNG, WebP, and GIF.
- **Slot state**: the admin form stores image UI state as individual slots with preview URL, optional existing URL, optional file, upload status, and error message.
- **Existing images**: existing product image URLs are loaded into slots and preserved unless the admin deletes that slot.
- **New images**: newly selected image files are appended into remaining slots and are uploaded only when the product is saved.
- **Failed images**: failed uploads remain visible with a failed status and error message. The product save is stopped until failed slots are removed or replaced.

## Save behavior

- Product create/update sends the full final image URL array to the API.
- Pending slots are uploaded through `/api/upload-image` before product create/update.
- Existing and already uploaded slots keep their current URLs.
- Upload/save loading states are reset through `finally` paths to prevent stuck disabled buttons.

## API consistency

- The upload endpoint accepts one file and returns a URL.
- Product create/update APIs store `images` as an array in `products.images`.
