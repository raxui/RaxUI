# QRCode and Carousel examples

Install `qr-code`, `carousel`, `button`, `input`, `switch`, `toggle`, and `rating`. Copy the Razor files into one namespace imported by the page; serve `CarouselExamples.css` from wwwroot and link it on the page. Supply `/avatars/coffee.jpg`, `/avatars/astronaut.jpg`, and `/avatars/chelsea.jpg`, or replace the demo image paths. Render `<QRCodeExamples />` and `<CarouselExamples />` with an interactive render mode; `Arabic=true` localizes primary captions and QR download labels. Each also includes a separate Arabic example.

QRCode has a content/shape/correction/color/logo playground, PNG/SVG downloads, SVG/Canvas/Image formats and Arabic UTF-8. Carousel has the autoplay hero/progress/pause, responsive products, Arabic products, fade gallery/thumbnails/counter, scale cards, and vertical quotes. The vertical example adds an explicit pause control for accessibility. Artwork uses solid theme colors and the same Lucide paths (ISC) as React.

See [the public behavior contract](../../../docs/blazor-qr-carousel.md) and [ADR 020](../../../docs/adr/020-third-party-source.md). No transport/backend is involved; prices and products are sample data.
