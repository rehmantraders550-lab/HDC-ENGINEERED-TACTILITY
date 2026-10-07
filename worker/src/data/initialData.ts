export interface Product {
  id: number;
  slug: string;
  name: string;
  family: string;
  short_description: string;
  description: string;
  typical_uses?: string;
  configuration_fields?: string;
  template: string; // 'A' | 'B'
  commercial_mode: string;
  status: 'draft' | 'published' | 'archived';
  public_visibility: number; // 1 or 0
  production_approved: number; // 1 or 0
  approved_by?: number | null;
  approved_at?: string | null;
  approval_note?: string | null;
  sort_order: number;
  profile_json?: string;
  configure?: string;
}

export interface QuoteRequest {
  id: number;
  customer_name: string;
  email: string;
  phone?: string | null;
  details: string;
  status: 'new' | 'in_review' | 'awaiting_customer' | 'quoted' | 'closed';
  created_at: string;
  updated_at: string;
  product_name?: string;
  matched_price_pkr?: string | null;
  evaluation_json?: string | null;
  configuration_json?: string | null;
}

export interface QuoteItem {
  id: number;
  quote_id: number;
  product_id?: number | null;
  configuration_json: string;
  matched_price_pkr?: string | null;
  evaluation_json?: string;
}

export interface ArtworkFile {
  id: number;
  quote_id: number;
  storage_key: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  created_at: string;
}

export interface Job {
  id: number;
  quote_id: number;
  job_reference: string;
  status: 'awaiting_customer_approval' | 'approved' | 'in_production' | 'quality_check' | 'ready' | 'completed' | 'on_hold' | 'cancelled';
  specification_snapshot: string;
  created_at: string;
  updated_at: string;
}

export interface PriceMatrixRow {
  id: number;
  product_id: number;
  configuration_hash: string;
  price_pkr: string;
  approved: number;
  approved_by: number;
  approved_at: string;
}

export interface AuditEvent {
  id: number;
  admin_id: number | null;
  event_type: string;
  entity_type: string;
  entity_id: number | null;
  details_json: string;
  created_at: string;
}

export const siteContent = {
  services: {
    'labels-decals': {
      title: 'Labels & Decals',
      kicker: 'SERVICE 01 / LABELS & DECALS',
      lead: 'From a single product label to a coordinated decal system, every surface and finish starts with the way it will be used.',
      body: 'Share the application, substrate, dimensions and handling conditions. HDC reviews material and adhesive choices against the actual use before confirming a print route.',
      products: ['labels-stickers', 'custom-sticker-sheets', 'uv-dtf-decals']
    },
    'products-object-printing': {
      title: 'Products & Object Printing',
      kicker: 'SERVICE 02 / PRODUCTS & OBJECT PRINTING',
      lead: 'Bring the object, its surface and your artwork into the same conversation.',
      body: 'Object printing depends on shape, coating, printable area and intended use. Direct UV and UV DTF remain separate candidate processes; each needs an approved product-specific route.',
      products: ['branded-promotional-products', 'uv-printed-bottles', 'printed-bottles']
    },
    'packaging-commercial-print': {
      title: 'Packaging & Commercial Print',
      kicker: 'SERVICE 03 / PACKAGING & COMMERCIAL PRINT',
      lead: 'Printed matter that carries a product story, a specification or a brand into the world.',
      body: 'Packaging, brochures, certificates and catalogues are planned around format, stock, print sides, color requirements and finishing. Dielines and artwork help HDC review the whole job.',
      products: ['packaging-print', 'brochures', 'certificates', 'catalogues']
    },
    'large-format-brand-environments': {
      title: 'Large Format & Brand Environments',
      kicker: 'SERVICE 04 / LARGE FORMAT & BRAND ENVIRONMENTS',
      lead: 'Campaigns and spaces shaped by scale, location and the material they meet.',
      body: 'Tell HDC where the graphic will live, how it will be mounted and what the surface is like. Wall condition, exposure and installation needs are part of the production review.',
      products: ['signage-retail-event-displays', 'posters', 'uv-printed-wall-vinyls']
    }
  },
  finishes: [
    { title: 'Protect', label: 'Surface', description: 'Change sheen, touch or resistance. The suitable finish depends on the stock, artwork and expected handling.' },
    { title: 'Reflect', label: 'Metallic', description: 'Use foil or reflective detail to direct light and establish visual hierarchy when the stock and construction support it.' },
    { title: 'Add dimension', label: 'Dimension', description: 'Raised or embossed details change how a printed piece is read and handled. Final feasibility needs artwork and substrate review.' },
    { title: 'Shape', label: 'Shape', description: 'Cutting, folding, mounting and assembly bring the print into its final form. Confirm dimensions and construction before production.' }
  ],
  surfaces: [
    ['Glass', 'Glass bottles, flat panels and coated glass. Surface coating, curvature and use affect feasibility.'],
    ['Acrylic', 'Flat or formed acrylic. Confirm thickness, geometry, coating and printable area.'],
    ['Metal', 'Bare or coated metal objects. Confirm the actual finish and shape before proposing a process.'],
    ['Wood', 'Natural or coated wood. Grain, sealer, texture and object geometry matter.'],
    ['Paper / paperboard', 'Paper stock and board for print, packaging and finishing. Weight, coating, grain and construction inform the route.'],
    ['Plastics', 'Plastic objects and sheet. Polymer type, surface treatment and coating need product-specific review.'],
    ['Rigid / flexible display media', 'Display substrates selected around format, mounting, location and handling.']
  ],
  faqs: [
    ['Can I receive a price immediately?', 'Only when HDC has an exact approved configuration and price row. Otherwise the request is reviewed and quoted; the site does not estimate from incomplete information.'],
    ['Can HDC print on my object?', 'Share the material, coating, geometry, printable area and intended use. Surface compatibility is checked against an approved product-specific profile.'],
    ['What artwork should I send?', 'Attach the clearest available production artwork and note its dimensions and version. HDC will follow up if a different file or specification is needed.'],
    ['Are UV and UV DTF available for every product?', 'They are common across many HDC products but are distinct processes. Their use for a specific product or surface requires production approval.'],
    ['Can I request a catalogue or poster run below 500 pieces?', 'The current owner-confirmed minimum is 500 pieces for catalogues and posters.'],
    ['How is a quote request handled?', 'HDC reviews the brief, artwork and production questions, then confirms the specification and next step. A submission is not an order confirmation.']
  ]
};

export const initialProducts: Product[] = [
  {
    id: 1,
    slug: 'custom-dtf-transfers',
    name: 'Custom DTF Transfers',
    family: 'DTF Transfers',
    short_description: 'Custom DTF transfers prepared around your artwork, finished dimensions and intended textile application.',
    description: 'Bring a logo, illustration or garment graphic as a transfer-ready file, or share the dimensions and application you have in mind. HDC reviews the artwork, scale and quantity before confirming the production specification. The finished transfers are supplied for application to suitable textiles, giving apparel makers, teams and businesses a practical route for producing their own branded garments. Use this service for chest, back or sleeve graphics, uniform branding, merchandise and short-run apparel work. If the garment or fabric is unusual, include that information with the request so suitability can be checked before production.',
    typical_uses: 'Logos · apparel graphics · uniform branding · merchandise · short-run transfers',
    configuration_fields: 'Finished size · artwork dimensions · quantity · number of designs or versions · artwork file · production notes',
    configure: 'Finished size · artwork dimensions · quantity · number of designs or versions · artwork file · production notes',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 1,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'finished_size'], notes: 'Standard DTF transfer profile approved.' })
  },
  {
    id: 2,
    slug: 'gang-sheets',
    name: 'Gang Sheets',
    family: 'DTF Transfers',
    short_description: 'Bring multiple transfer graphics together in one planned sheet for a more organized production run.',
    description: 'Gang sheets are designed for jobs that contain several graphics, sizes or garment placements. Submit each design with its intended dimensions and quantity, and HDC can review how the set should be prepared for production. This is useful when a run includes a mix of chest marks, sleeve graphics, names or other repeat artwork and you want the job considered as one coordinated sheet. The final layout depends on the supplied artwork, sheet format and production requirements. If you need assistance preparing the arrangement, include that request when you submit the job.',
    typical_uses: 'Mixed logo sizes · multiple garment positions · apparel batches · uniform graphics',
    configuration_fields: 'Sheet size · artwork count · artwork dimensions · versions · quantity · layout assistance · artwork files',
    configure: 'Sheet size · artwork count · artwork dimensions · versions · quantity · layout assistance · artwork files',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 2,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'sheet_size'], notes: 'Gang sheet production profile approved.' })
  },
  {
    id: 3,
    slug: 'bulk-transfers',
    name: 'Bulk Transfers',
    family: 'DTF Transfers',
    short_description: 'Repeat transfer production for a consistent artwork set, planned around your quantity and application needs.',
    description: 'Bulk transfers suit businesses, apparel teams and merchandise projects that need a larger run of one design or a controlled group of designs. Share the approved artwork, transfer dimensions, quantity and any repeat-production requirements. HDC reviews the files and job details before confirming the specification for the run. For repeat orders, identify the artwork version you want to use and note any changes from the previous job. That gives the team a clear basis for reviewing the request without assuming that an older file or specification is still current.',
    typical_uses: 'Uniform batches · apparel production · merchandise · repeat branded applications',
    configuration_fields: 'Transfer size · quantity · design count · artwork versions · repeat-order notes · artwork files',
    configure: 'Transfer size · quantity · design count · artwork versions · repeat-order notes · artwork files',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 3,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'finished_size'], notes: 'Bulk transfer production profile approved.' })
  },
  {
    id: 4,
    slug: 't-shirts',
    name: 'T-Shirts',
    family: 'Finished DTF Apparel',
    short_description: 'Printed T-shirts configured around garment style, size, color, artwork placement and quantity.',
    description: 'Create a T-shirt run for a brand, event, team or merchandise collection. Start with the garment type and size range, then specify the garment color, print position, graphic dimensions and quantity. HDC reviews the artwork and garment details together so the requested layout can be checked against the actual application. For mixed-size orders, provide a clear size breakdown. If several artwork versions or placements are involved, list them separately so the production brief reflects the garments you need rather than treating the order as one repeated item.',
    typical_uses: 'Brand apparel · event shirts · team wear · merchandise · staff clothing',
    configuration_fields: 'Garment type · sizes · color · print position · print dimensions · quantity · artwork versions · artwork files',
    configure: 'Garment type · sizes · color · print position · print dimensions · quantity · artwork versions · artwork files',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 4,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'garment_size', 'color'], notes: 'T-shirt apparel profile approved.' })
  },
  {
    id: 5,
    slug: 'hoodies',
    name: 'Hoodies',
    family: 'Finished DTF Apparel',
    short_description: 'Printed hoodies planned by style, size, color, placement and artwork dimensions.',
    description: 'Hoodies give brands, teams and organizations more room to build a recognizable garment graphic. Define the hoodie style and size range, then choose the requested front, back or sleeve placement and share the artwork dimensions. HDC reviews the garment and print arrangement before confirming the job details. When one order includes several positions or garment colors, describe each combination clearly. This helps the team identify whether the artwork, placement and quantity are consistent across the run or need separate production lines.',
    typical_uses: 'Brand apparel · team clothing · merchandise · staff and event garments',
    configuration_fields: 'Hoodie style · size · color · front/back/sleeve position · print dimensions · quantity · artwork',
    configure: 'Hoodie style · size · color · front/back/sleeve position · print dimensions · quantity · artwork',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 5,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'size', 'color'], notes: 'Hoodie apparel profile approved.' })
  },
  {
    id: 6,
    slug: 'jerseys-uniforms',
    name: 'Jerseys / Uniforms',
    family: 'Finished DTF Apparel',
    short_description: 'Uniform and jersey orders organized around garment types, size breakdowns, logo positions and variable names or numbers.',
    description: 'Build a coordinated uniform or jersey order with the details needed to keep each garment correctly specified. Share the garment type, full size breakdown, total quantities, logo placements and any names or numbers that vary by wearer. HDC reviews the artwork and personalization structure before confirming how the job should be prepared. If names, numbers or other artwork change from one garment to another, provide a roster or clearly organized variable-data file. Identify the approved artwork version and note which elements repeat across the whole order.',
    typical_uses: 'Team jerseys · staff uniforms · club apparel · organized group orders',
    configuration_fields: 'Garment type · size breakdown · quantity · logo positions · names/numbers · variable artwork · artwork files',
    configure: 'Garment type · size breakdown · quantity · logo positions · names/numbers · variable artwork · artwork files',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 6,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'roster'], notes: 'Team jerseys and uniform profile approved.' })
  },
  {
    id: 7,
    slug: 'caps',
    name: 'Caps',
    family: 'Finished DTF Apparel',
    short_description: 'Custom cap graphics specified by cap style, color, print location and artwork size.',
    description: 'Plan a cap order for a business, team, event or merchandise range. Share the cap style and color, identify the intended print location, and provide the graphic dimensions and artwork. Because cap shapes and available printable areas vary, HDC reviews the object and placement before confirming the production route. If you have a particular cap sample or reference, include it with the request. The review can then be based on the actual shape and intended application rather than an assumed flat print area.',
    typical_uses: 'Team identity · staff caps · promotional headwear · branded merchandise',
    configuration_fields: 'Cap style · color · print location · artwork dimensions · quantity · artwork file',
    configure: 'Cap style · color · print location · artwork dimensions · quantity · artwork file',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 7,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'color', 'style'], notes: 'Cap profile approved.' })
  },
  {
    id: 8,
    slug: 'uv-dtf-decals',
    name: 'UV DTF Decals',
    family: 'UV Printing + Decals',
    short_description: 'Decorative UV DTF transfers for selected hard-surface applications, reviewed against the object and its finish.',
    description: 'UV DTF decals make it possible to prepare a printed graphic for application to a suitable object surface. Share the object type, surface material, shape, printable area and artwork dimensions so HDC can assess the intended use. The request may also need to specify whether a white ink layer or a particular finish is required. Compatibility depends on the actual surface and application. Glass, acrylic, selected plastics, selected metals and coated surfaces are examples in the catalogue, not a blanket approval for every object in those material groups. HDC confirms suitability before recommending a production route.',
    typical_uses: 'Branding for bottles and jars · promotional objects · selected glass, acrylic, plastic or metal applications',
    configuration_fields: 'Surface · object · geometry · printable area · artwork dimensions · quantity · white ink/finish request · artwork',
    configure: 'Surface · object · geometry · printable area · artwork dimensions · quantity · white ink/finish request · artwork',
    template: 'B',
    commercial_mode: 'TECHNICAL_REVIEW',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 8,
    profile_json: JSON.stringify({ approved_fields: ['surface', 'geometry', 'printable_area', 'quantity'], notes: 'Surface review required for all objects.' })
  },
  {
    id: 9,
    slug: 'labels-stickers',
    name: 'Labels & Stickers',
    family: 'UV Printing + Decals',
    short_description: 'Printed labels and stickers shaped around your product, packaging or promotional use.',
    description: 'Create labels or stickers for product identification, packaging, promotions and brand communication. Specify the finished size and shape, the intended material or adhesive stock, quantity, cut type and any lamination request. If the same design will be used in several sizes or versions, list each variation so the job can be reviewed accurately. The best construction depends on where the label will be applied and how it will be handled. Share the surface and application context with the artwork so HDC can confirm which available stock and finish should be considered.',
    typical_uses: 'Product labels · packaging labels · promotional stickers · brand identification · custom-cut graphics',
    configuration_fields: 'Shape · size · material/adhesive stock · print route · quantity · lamination · cut type · versions · artwork',
    configure: 'Shape · size · material/adhesive stock · print route · quantity · lamination · cut type · versions · artwork',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 9,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'sheet_size', 'finished_size'], notes: 'A3 sheet base PKR 2,500 approved.' })
  },
  {
    id: 10,
    slug: 'custom-sticker-sheets',
    name: 'Custom Sticker Sheets',
    family: 'UV Printing + Decals',
    short_description: 'A coordinated sheet of custom stickers, organized around your designs, sheet size and cut style.',
    description: 'Custom sticker sheets bring several graphics together in one finished format. They work well for branded sticker packs, promotional handouts, retail sets and collections with multiple designs. Share the sheet dimensions, sticker count, material preference, finish and cut style, along with the artwork for each design. If the sheet should follow a particular arrangement, provide a layout reference or ask for layout assistance. HDC reviews the artwork count, dimensions and cutting requirements before confirming the production brief.',
    typical_uses: 'Kiss-cut sheets · branded packs · multi-design collections · promotional sheets · retail sticker products',
    configuration_fields: 'Sheet size · sticker type/count · material · finish · cut style · quantity · design count · artwork/layout',
    configure: 'Sheet size · sticker type/count · material · finish · cut style · quantity · design count · artwork/layout',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 10,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'sheet_size'], notes: 'A3 sheet base PKR 2,500 approved.' })
  },
  {
    id: 11,
    slug: 'uv-printed-bottles',
    name: 'UV Printed Bottles',
    family: 'UV Printing + Decals',
    short_description: 'A focused route for bottle graphics, with the surface and geometry reviewed before the print specification is confirmed.',
    description: 'Develop a branded, promotional or decorative bottle graphic around the bottle you intend to use. Share the bottle type, material, surface coating, geometry and printable area, along with the artwork and quantity. HDC reviews those details to determine whether a suitable UV printing route can be confirmed for the specific object. Bottle shape, coating and available print area can change the production requirements. White ink or a gloss effect may be considered only where the chosen route supports it. Submit the actual bottle or a reliable specification when the application needs technical review.',
    typical_uses: 'Branded bottles · promotional drinkware · decorative bottles · retail containers · gift objects',
    configuration_fields: 'Bottle type · material/coating · geometry · printable area · candidate route · ink/finish request · quantity · designs · artwork',
    configure: 'Bottle type · material/coating · geometry · printable area · candidate route · ink/finish request · quantity · designs · artwork',
    template: 'B',
    commercial_mode: 'TECHNICAL_REVIEW',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 11,
    profile_json: JSON.stringify({ approved_fields: ['surface', 'geometry', 'printable_area', 'quantity'], notes: 'Direct UV bottle profile approved.' })
  },
  {
    id: 12,
    slug: 'packaging-print',
    name: 'Packaging Print',
    family: 'Commercial Print + Branding',
    short_description: 'Printed packaging specified around the format, board, finished dimensions, quantity and required finish.',
    description: 'Prepare packaging print for a product, retail presentation, bakery or food-service use. HDC can review formats such as folding cartons, sleeves and inserts alongside the finished size, board or paper, GSM, print sides, color requirements, quantity and finishing. Include the artwork and dieline so the production team can assess the printed piece as a complete job. Packaging depends on both its graphic artwork and its physical construction. If the format or dieline is still being developed, identify that at the start of the request so structural questions are resolved before the print specification is treated as final.',
    typical_uses: 'Folding cartons · sleeves · inserts · retail packaging · bakery/food packaging · product packaging',
    configuration_fields: 'Finished size · format/construction · board/paper · GSM · print sides · color · lamination/finish · quantity · artwork/dieline',
    configure: 'Finished size · format/construction · board/paper · GSM · print sides · color · lamination/finish · quantity · artwork/dieline',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 12,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'finished_size', 'format'], notes: 'Packaging structural and print profile approved.' })
  },
  {
    id: 13,
    slug: 'branded-promotional-products',
    name: 'Branded / Promotional Products',
    family: 'Commercial Print + Branding',
    short_description: 'Printed objects and branded items scoped around the chosen object, surface and intended application.',
    description: 'Bring a promotional or branded object concept and HDC will help identify the information needed to review it. The right route depends on the object’s material, coating, geometry, printable area and quantity. Share a product sample, supplier specification or clear reference alongside the artwork so the proposed application can be assessed against the actual surface. Some jobs can follow a standard configuration; others need a technical review before the production method or finish can be confirmed. The page should make that distinction clear and collect only the details relevant to the selected object.',
    typical_uses: 'Corporate merchandise · promotional items · gift objects · branded pieces · custom production requests',
    configuration_fields: 'Object type · material/surface · geometry · printable area · artwork · quantity · finish/effect request',
    configure: 'Object type · material/surface · geometry · printable area · artwork · quantity · finish/effect request',
    template: 'B',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 13,
    profile_json: JSON.stringify({ approved_fields: ['surface', 'geometry', 'printable_area', 'quantity'], notes: 'Object branding profile approved.' })
  },
  {
    id: 14,
    slug: 'brochures',
    name: 'Brochures',
    family: 'Commercial Print + Branding',
    short_description: 'Printed brochures planned around their finished size, fold, paper and the amount of information they need to carry.',
    description: 'Use a brochure to introduce a business, explain a service, present a product range or support an event or sales conversation. Define the finished and flat sizes, fold type, paper, GSM, print sides, color, quantity and any lamination request. These choices help the production team understand both the reading format and the physical specification. Upload print-ready artwork or provide a clear brief for the layout and number of versions. When the brochure includes several panels, confirm the panel order and fold direction in the supplied artwork or production notes.',
    typical_uses: 'Marketing literature · product information · corporate brochures · event materials · sales collateral',
    configuration_fields: 'Finished/flat size · fold type · paper/GSM · print sides · color · lamination · quantity · versions · artwork',
    configure: 'Finished/flat size · fold type · paper/GSM · print sides · color · lamination · quantity · versions · artwork',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 14,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'finished_size', 'fold_type'], notes: 'Brochure production profile approved.' })
  },
  {
    id: 15,
    slug: 'certificates',
    name: 'Certificates',
    family: 'Commercial Print + Branding',
    short_description: 'Certificates printed to the requested size, paper, color and personalization requirements.',
    description: 'Prepare certificates for organizations, schools, events, awards and recognition programs. Specify the finished size and paper or card, GSM, color treatment, print sides and quantity. If each certificate needs a different name, number or other field, identify the variable information and provide it in a clearly organized list for review. Finishing can be included when it is available for the selected stock and job. Share the artwork and explain how the certificate will be presented so HDC can review the complete specification before confirming it.',
    typical_uses: 'Corporate and academic certificates · awards · events · personalized recognition',
    configuration_fields: 'Size · paper/card · GSM · color · single/double-sided · quantity · variable names/serials · finish · artwork',
    configure: 'Size · paper/card · GSM · color · single/double-sided · quantity · variable names/serials · finish · artwork',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 15,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'finished_size', 'paper_gsm'], notes: 'Certificate profile approved.' })
  },
  {
    id: 16,
    slug: 'printed-bottles',
    name: 'Printed Bottles',
    family: 'Commercial Print + Branding',
    short_description: 'A general starting point for bottle printing when the best process has not yet been determined.',
    description: 'Use this route when you know the bottle or container you want to brand but need help confirming how it can be printed. Share the bottle type, material, geometry, surface or coating details, printable area, intended use, quantity and artwork. HDC reviews the object first, then identifies a candidate production route where the required compatibility information is available. Printed Bottles is the broader entry point in the catalogue. For a UV-focused request, use the dedicated UV Printed Bottles route. Both records should draw on the same underlying bottle, surface and compatibility data so the customer receives consistent guidance.',
    typical_uses: 'Branded containers · promotional bottles · retail and gift objects',
    configuration_fields: 'Bottle type · material · geometry · printable area · use · surface/coating · quantity · artwork',
    configure: 'Bottle type · material · geometry · printable area · use · surface/coating · quantity · artwork',
    template: 'B',
    commercial_mode: 'TECHNICAL_REVIEW',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 16,
    profile_json: JSON.stringify({ approved_fields: ['surface', 'geometry', 'printable_area', 'quantity'], notes: 'General bottle printing review profile approved.' })
  },
  {
    id: 17,
    slug: 'signage-retail-event-displays',
    name: 'Signage / Retail & Event Displays',
    family: 'Large Format + Display',
    short_description: 'Signs and display pieces scoped to their dimensions, material, setting and hardware requirements.',
    description: 'Plan graphics for a retail space, event, exhibition or promotional display. Start with the display type and finished dimensions, then specify the intended material, quantity, finishing and any stand or hardware requirements. The environment and installation scope matter: share where the display will be used and whether it needs to be mounted, assembled or installed. The catalogue includes formats such as X-banners, retail displays, event graphics and promotional signage. HDC reviews the artwork and physical requirements together so the production request reflects the actual display rather than just the printed panel.',
    typical_uses: 'X-banners · retail displays · event graphics · promotional signage · rigid or flexible display media',
    configuration_fields: 'Display type · dimensions · material · print route · stand/hardware · quantity · finish · artwork',
    configure: 'Display type · dimensions · material · print route · stand/hardware · quantity · finish · artwork',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 17,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'finished_size', 'display_type'], notes: 'Signage and display profile approved.' })
  },
  {
    id: 18,
    slug: 'posters',
    name: 'Posters',
    family: 'Large Format + Display',
    short_description: 'Poster printing for promotions, events, retail and information, specified by size, material and quantity.',
    description: 'Create a poster for a campaign, event, retail space or information display. Choose the finished size and material, specify the print type and quantity, and indicate whether the run uses the same artwork throughout or includes multiple versions. Lamination can be requested where it is relevant to the selected material and use. For a coordinated campaign, submit the artwork versions together and identify which dimensions belong to each design. HDC reviews the files and requested specification before confirming the job.',
    typical_uses: 'Promotional posters · event posters · retail graphics · informational displays · indoor promotional print',
    configuration_fields: 'Finished size · material · print type · quantity · same/variable artwork · lamination request · artwork files',
    configure: 'Finished size · material · print type · quantity · same/variable artwork · lamination request · artwork files',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 18,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'print_colors', 'finished_size'], notes: 'Poster minimum 500 pcs, colors 1,2,4 approved.' })
  },
  {
    id: 19,
    slug: 'uv-printed-wall-vinyls',
    name: 'UV Printed Wall Vinyls',
    family: 'Large Format + Display',
    short_description: 'UV printed wall graphics planned around the dimensions, vinyl, wall condition and installation scope.',
    description: 'Develop a wall graphic for a branded interior, retail setting, promotional space or decorative application. Share the wall dimensions, finished graphic size, vinyl or film preference, surface condition and whether the job is indoors or outdoors. If installation is required, include the location and installation scope so those details can be reviewed with the print request. Adhesion and suitability depend on the actual wall surface and environment. HDC reviews those conditions before confirming the material and production route; the product page should not promise compatibility or service life without an approved profile for that exact application.',
    typical_uses: 'Branded interiors · retail graphics · promotional walls · decorative graphics · replaceable branded surfaces',
    configuration_fields: 'Wall/graphic dimensions · vinyl/film · wall condition · environment · quantity · installation request · artwork',
    configure: 'Wall/graphic dimensions · vinyl/film · wall condition · environment · quantity · installation request · artwork',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 19,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'finished_size', 'wall_condition'], notes: 'Wall vinyls profile approved.' })
  },
  {
    id: 20,
    slug: 'catalogues',
    name: 'Catalogues',
    family: 'Commercial Print + Branding',
    short_description: 'Catalogue printing for product ranges, services and collections, scoped around your format and print specification.',
    description: 'Prepare a catalogue for a product range, service collection or organization. Share the finished size, page count, binding preference, paper and GSM, print sides, color specification and quantity. HDC reviews the artwork and finishing details before confirming the production brief.',
    typical_uses: 'Product catalogues · service directories · collection guides',
    configuration_fields: 'Size · page count · binding · paper/GSM · print sides · color count · quantity · artwork',
    configure: 'Size · page count · binding · paper/GSM · print sides · color count · quantity · artwork',
    template: 'A',
    commercial_mode: 'QUOTE',
    status: 'published',
    public_visibility: 1,
    production_approved: 1,
    sort_order: 20,
    profile_json: JSON.stringify({ approved_fields: ['quantity', 'print_colors', 'page_count'], notes: 'Catalogue minimum 500 pcs, colors 1,2,4 approved.' })
  }
];
