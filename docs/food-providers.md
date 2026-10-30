# Food data providers (F1)

**Status:** Accepted.
**Evaluated:** 2026-10-30
**Feeds:** F2 (#14) food model, F3 (#17) barcode lookup, F4 (#18) search and
generic ingredients, O2 (#24) coverage gate.

## What the app needs

- Barcode lookup for US packaged foods, scanned on a phone.
- Text search over branded foods and generic ingredients such as "banana" or
  "chicken breast, cooked".
- Calories, protein, carbohydrate, and fat, plus a serving description with
  a grams-per-serving value. The diary already supports logging by serving or
  by grams, and needs that conversion.
- One user and low volume, so tens of lookups a day. The API calls the provider;
  the browser never does. Keys stay on the server.
- Free or close to free, with terms that let us store a snapshot of what was
  logged. The F6 diary already plans to keep snapshots.

## Candidates

| | USDA FoodData Central | Open Food Facts | FatSecret Platform | Edamam Food DB | Nutritionix |
|---|---|---|---|---|---|
| **Coverage** | US. Branded Foods with GTIN/UPC, plus Foundation and SR Legacy generics | Global, crowd-sourced, strong in the EU. US branded coverage is decent but patchy | Large global and US database with barcodes | ~615k UPCs and generic foods | Large US restaurant and branded database |
| **Accuracy** | Branded: label data submitted by manufacturers. Generics: lab-analyzed, with rich household portions | Varies. Volunteer entry; per-100 g and per-serving values sometimes swapped | Curated in-house | Curated plus parsed | Curated |
| **Licensing** | Public domain (CC0). Free to cache and store | ODbL: attribution and share-alike on derived *databases* | Basic and Premier Free tiers require attribution | Attribution required; caching only on some paid plans | Commercial terms |
| **Rate limits** | 1,000 req/hr per key; `DEMO_KEY` 10/hr (measured) | ~15/min for product reads, lower for search; custom User-Agent required | Basic is reportedly ~5k/day (unverified) | 50/min on the lowest plan | Unclear; reportedly ~500/day free |
| **Cost** | Free (data.gov key) | Free | Basic is free. Barcode needs Premier Free (US dataset, approval required) or a paid Premier quote | From $14/mo | Paid plans, reportedly ~$449/mo for API tiers (unverified) |
| **Barcode** | Yes, via Branded Foods `gtinUpc` | Yes, the primary use case | Premier only | Yes | Yes |

Vendor pricing changes often. Sources: the
[FDC API guide](https://fdc.nal.usda.gov/api-guide),
[OFF API docs](https://openfoodfacts.github.io/openfoodfacts-server/api/),
[OFF ODbL](https://wiki.openfoodfacts.org/ODBL_License),
[FatSecret editions](https://platform.fatsecret.com/api-editions), and the
[Edamam Food DB page](https://developer.edamam.com/food-database-api).
Nutritionix figures come from third parties only.

## Spot check (2026-10-30)

| Probe | FDC | OFF |
|---|---|---|
| Chobani Nonfat Plain, `0894700010137` | **Miss**, both with and without the leading zero | Hit: 170 g serving, 9.5 g protein per 100 g |
| Clif Chocolate Chip, `722252100900` | Hit: 368 kcal/100 g, 1 bar = 68 g | Hit, matches FDC |
| Clif Crunchy PB, `722252101204` | Hit: 382 kcal/100 g | Hit, but **wrong**: 260 kcal/100 g, which is per-bar data entered as per-100 g |
| "banana raw" (generics) | SR Legacy `Bananas, raw` at 89 kcal, with 8 household portions (small, medium, cup sliced, and more) | n/a |
| "chobani nonfat plain" text search | 39k hits, with other brands ranked first | Ranked correctly |

Takeaways:

- Neither source covers everything.
- FDC is the more trustworthy of the two, and its generics are excellent.
- OFF fills gaps in barcode coverage, but its data needs sanity checks.
- FDC's branded text search ranks results poorly.
- FDC Foundation records can report energy in kJ under the same name
  (`Bananas, overripe, raw` showed 357), so F2 must normalize on the nutrient
  number and unit, not the name.

## Recommendation

Use **USDA FoodData Central as the primary source, with Open Food Facts as the
fallback**. Both are free, and nothing is paid until the O2 coverage gate shows
a need.

- **Generic ingredients (F4):** FDC Foundation and SR Legacy only. These are
  lab data with household portions, released as CC0.
- **Barcode (F3):** look up FDC Branded by GTIN first, normalizing UPC-A,
  EAN-13, and GTIN-14 padding. On a miss, fall back to OFF `/api/v2/product/{code}`
  with a custom User-Agent.
- **Branded text search (F4):** query FDC Branded and OFF, then merge results.
  Because FDC ranks brands poorly, rank by brand and name match on our side.
- **Sanity checks on every import, from either source.** Flag a record when
  the Atwater estimate, 4·P + 4·C + 9·F, differs from the stated kcal by more
  than about 20%. Also flag when the per-100 g kcal is implausible for the
  serving weight. Show the flag and let the user correct the value. The F5
  personal foods and corrections feature already plans for this.
- **Provenance (F2):** store the source (`fdc` or `off`), the source ID, the
  fetch time, and the raw payload hash on every food. Keep OFF-derived records
  distinguishable so ODbL attribution and share-alike stay manageable.
  Show "Data from Open Food Facts (ODbL)" on those foods.
- **Keys and limits:** put the FDC key in configuration as a secret, validated
  through `IOptions` (S1). Cache lookups server-side. 1,000 req/hr is far above
  single-user needs.

**Rejected for now:**

- Edamam: paid, with restrictive caching and attribution rules.
- Nutritionix: expensive, with unclear pricing.
- FatSecret: barcode access needs Premier approval. FatSecret Premier Free is
  the **escalation path** if O2 finds the FDC + OFF barcode hit rate too low on
  the owner's real groceries.

## Decision

Accepted on 2026-10-30: FDC is the primary source, OFF is the fallback, and
there is no paid provider for now.

**Architecture:**

- **Provider chain.** Each source implements a common `IFoodProvider`
  interface:
  - `LookupBarcodeAsync(gtin)` and `SearchAsync(query)`.
  - Each returns normalized candidate foods with provenance.
- **Order.** The API composes providers into an ordered chain:
  - Our own database (local foods), then FDC, then OFF.
  - Barcode lookup stops at the first hit.
  - Search merges and ranks results across providers.
  - A later provider, such as FatSecret, is just another link in the chain.
- **Generics.** USDA Foundation and SR Legacy are bulk-imported into our own
  food table:
  - The import is an ops command that is safe to re-run, executed locally and
    during deploy.
  - There is no admin UI.
- **Packaged foods.** These are fetched live on first use, then saved with
  their provenance. Each product is fetched from a provider only once.
  - Updates happen only through an explicit "refresh from source" action.
  - Diary entries keep their own nutrition snapshots, so a refresh never
    changes past days.
- **Corrections.** User corrections (F5) override source values.
- **Revisit at O2:** a nightly import of US branded foods, or adding
  FatSecret, if live lookups prove slow or barcode misses are frequent.
