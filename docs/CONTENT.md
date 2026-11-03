# Content provenance and validation

The corpus contains exactly **4,000 distinct text bodies**, preserving the previous 3,000 and appending 1,000 more: 1,877 Easy, 1,123 Medium and 1,000 Difficult. The original baseline had 1,000 per difficulty. Each difficulty includes 20 original Keyderby passages. The remainder is derived from classical source editions catalogued as public domain in the USA. This satisfies the numerical corpus requirement with actual text; it does not claim that all passages are newly authored or that full editorial acceptance is complete.

Source editions include Alice's Adventures in Wonderland, The Secret Garden, Anne of Green Gables, Little Women, Pride and Prejudice, Walden, On the Origin of Species, and The Wealth of Nations. The retained McGuffey reader also contributes newly added clean excerpts. Full editions and notices remain available in the website's Text sources page. Catalog URLs and SHA-256 hashes are in `public/sources/catalog.json`.

The source publisher's permission and license documents:

- https://www.gutenberg.org/policy/permission
- https://www.gutenberg.org/policy/license
- https://www.gutenberg.org/MIRRORS.ALL

Source editions were downloaded from a listed mirror, except the initial McGuffey examination. No Gutenberg copyrighted-with-permission titles were selected. Catalog public-domain status is US-specific; international reuse requires checking the applicable jurisdiction. The original source editions, full license text, GitHub provenance metadata, and published /sources files remain available; inline license accordions have been removed from the public practice UI, not the licensed source material. No claim of worldwide copyright clearance is made.

Curation removes headers, front matter markers, illustration/footnote blocks, obvious OCR artifacts, selected offensive terms, and some heavy dialect. It takes contiguous complete sentences within paragraphs. Source sentences are allocated once to excerpt selections; exact duplicate text is rejected. Typographic quotes/dashes and whitespace are normalized for typing. Original source editions remain unmodified.

Easy: 40–100 words with a short-sentence/average-word-length proxy. Medium: 100–180 words. Hard: 150–300 words, primarily longer literary, scientific and economic prose. Punctuation and word-length metrics, character counts, estimated completion time, language and tags are recorded or computed. These estimates do not certify vocabulary level or historical factual accuracy.

Automated structural validation and sampled human-readable review passed. An individual editorial review of every excerpt has not been completed. Automated screening is not a guarantee that every context is suitable for every age. Original modern passages span the full requested category list, while most of the broader corpus is classic literature, nature, science and business. More original contemporary material and category balance remain desirable.
