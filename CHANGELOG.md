# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **AVIF image upload support**: Accept AVIF format for all photo/picture uploads.
  - **Settings (tenant logo)**: File input and backend accept `image/avif`; logo upload validates and optimizes AVIF (Pillow), keeps `.avif` extension.
  - **Product details**: Product image upload accepts `image/avif` in the file picker and API; backend `ALLOWED_IMAGE_TYPES` and `optimize_image()` handle AVIF; stored filenames may use `.avif`.
  - Backend: `ALLOWED_IMAGE_TYPES` includes `image/avif`; `optimize_image()` saves AVIF with `AVIF_QUALITY`; allowed extensions for logo and product image include `.avif`.
  - Frontend: `accept` attributes updated to `image/jpeg,image/png,image/webp,image/avif` for both settings and products.
