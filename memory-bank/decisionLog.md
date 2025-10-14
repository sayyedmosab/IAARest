# Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-14 | Preserve DB field 'image_filename' as canonical, remove 'imageUrl' from API responses, and use client-side ImagePathPipe for final image src computation to handle leading slashes and path construction. | Avoids destructive DB changes, ensures consistent image paths, and allows flexible presentation-layer handling of filenames that may include leading slashes. |
