export type HoldedLocale = 'en' | 'es' | 'ca' | 'fr' | 'pl' | 'de';

const TABLE_LABELS: Record<string, Record<HoldedLocale, string>> = {
    invoices:      { en: 'Invoices', es: 'Facturas', ca: 'Factures', fr: 'Factures', pl: 'Faktury', de: 'Rechnungen' },
    invoice_lines: { en: 'Invoice Lines', es: 'Líneas de Factura', ca: 'Línies de Factura', fr: 'Lignes de facture', pl: 'Pozycje faktur', de: 'Rechnungspositionen' },
    contacts:      { en: 'Contacts', es: 'Contactos', ca: 'Contactes', fr: 'Contacts', pl: 'Kontakty', de: 'Kontakte' },
    products:      { en: 'Products', es: 'Productos', ca: 'Productes', fr: 'Produits', pl: 'Produkty', de: 'Produkte' },
    ledger:        { en: 'Ledger', es: 'Asientos Contables', ca: 'Assentaments Comptables', fr: 'Écritures comptables', pl: 'Zapisy księgowe', de: 'Buchungssätze' },
};

const TABLE_DESCRIPTIONS: Record<string, Record<HoldedLocale, string>> = {
    invoices:      { en: 'Holded invoices and their summary', es: 'Facturas de Holded y su resumen', ca: 'Factures de Holded i el seu resum', fr: 'Factures Holded et leur résumé', pl: 'Faktury z Holded i ich podsumowanie', de: 'Holded-Rechnungen und ihre Übersicht' },
    invoice_lines: { en: 'Line items detail for each invoice', es: 'Líneas de detalle de cada factura', ca: 'Línies de detall de cada factura', fr: 'Lignes de détail de chaque facture', pl: 'Pozycje szczegółowe każdej faktury', de: 'Detailpositionen jeder Rechnung' },
    contacts:      { en: 'Customers and suppliers from Holded', es: 'Clientes y proveedores de Holded', ca: 'Clients i proveïdors de Holded', fr: 'Clients et fournisseurs de Holded', pl: 'Klienci i dostawcy z Holded', de: 'Kunden und Lieferanten aus Holded' },
    products:      { en: 'Product catalogue from Holded', es: 'Catálogo de productos de Holded', ca: 'Catàleg de productes de Holded', fr: 'Catalogue de produits de Holded', pl: 'Katalog produktów z Holded', de: 'Produktkatalog aus Holded' },
    ledger:        { en: 'Daily accounting ledger entries', es: 'Asientos del libro diario contable', ca: 'Assentaments del llibre diari comptable', fr: 'Écritures du journal comptable', pl: 'Zapisy dziennika księgowego', de: 'Buchungen des Journals' },
};

const COLUMN_LABELS: Record<string, Record<HoldedLocale, string>> = {
    // shared
    id:             { en: 'ID', es: 'ID', ca: 'ID', fr: 'ID', pl: 'ID', de: 'ID' },
    name:           { en: 'Name', es: 'Nombre', ca: 'Nom', fr: 'Nom', pl: 'Nazwa', de: 'Name' },
    type:           { en: 'Type', es: 'Tipo', ca: 'Tipus', fr: 'Type', pl: 'Typ', de: 'Typ' },
    subtotal:       { en: 'Subtotal', es: 'Subtotal', ca: 'Subtotal', fr: 'Sous-total', pl: 'Suma częściowa', de: 'Zwischensumme' },
    total:          { en: 'Total', es: 'Total', ca: 'Total', fr: 'Total', pl: 'Suma', de: 'Gesamt' },
    discount:       { en: 'Discount', es: 'Descuento', ca: 'Descompte', fr: 'Remise', pl: 'Rabat', de: 'Rabatt' },
    taxes:          { en: 'Taxes', es: 'Impuestos', ca: 'Impostos', fr: 'Taxes', pl: 'Podatki', de: 'Steuern' },
    status:         { en: 'Status', es: 'Estado', ca: 'Estat', fr: 'Statut', pl: 'Status', de: 'Status' },
    currency:       { en: 'Currency', es: 'Divisa', ca: 'Divisa', fr: 'Devise', pl: 'Waluta', de: 'Währung' },
    description:    { en: 'Description', es: 'Descripción', ca: 'Descripció', fr: 'Description', pl: 'Opis', de: 'Beschreibung' },
    sku:            { en: 'SKU', es: 'SKU', ca: 'SKU', fr: 'SKU', pl: 'SKU', de: 'SKU' },
    category_id:    { en: 'Category ID', es: 'ID Categoría', ca: 'ID Categoria', fr: 'ID catégorie', pl: 'ID kategorii', de: 'Kategorie-ID' },
    email:          { en: 'Email', es: 'Email', ca: 'Email', fr: 'E-mail', pl: 'E-mail', de: 'E-Mail' },
    phone:          { en: 'Phone', es: 'Teléfono', ca: 'Telèfon', fr: 'Téléphone', pl: 'Telefon', de: 'Telefon' },
    mobile:         { en: 'Mobile', es: 'Móvil', ca: 'Mòbil', fr: 'Mobile', pl: 'Telefon komórkowy', de: 'Mobiltelefon' },
    country:        { en: 'Country', es: 'País', ca: 'País', fr: 'Pays', pl: 'Kraj', de: 'Land' },
    vat:            { en: 'VAT Number', es: 'NIF', ca: 'NIF', fr: 'Numéro de TVA', pl: 'NIP', de: 'USt-IdNr.' },

    // invoices
    number:         { en: 'Number', es: 'Número', ca: 'Número', fr: 'Numéro', pl: 'Numer', de: 'Nummer' },
    date:           { en: 'Date', es: 'Fecha', ca: 'Data', fr: 'Date', pl: 'Data', de: 'Datum' },
    due_date:       { en: 'Due Date', es: 'Fecha Vencimiento', ca: 'Data Venciment', fr: 'Date d\'échéance', pl: 'Termin płatności', de: 'Fälligkeitsdatum' },
    contact_id:     { en: 'Contact ID', es: 'ID Contacto', ca: 'ID Contacte', fr: 'ID contact', pl: 'ID kontaktu', de: 'Kontakt-ID' },
    contact:        { en: 'Contact', es: 'Contacto', ca: 'Contacte', fr: 'Contact', pl: 'Kontakt', de: 'Kontakt' },
    paid:           { en: 'Paid', es: 'Pagado', ca: 'Pagat', fr: 'Payé', pl: 'Zapłacono', de: 'Bezahlt' },
    pending:        { en: 'Pending', es: 'Pendiente', ca: 'Pendent', fr: 'En attente', pl: 'Do zapłaty', de: 'Offen' },

    // invoice_lines
    invoice_id:     { en: 'Invoice ID', es: 'ID Factura', ca: 'ID Factura', fr: 'ID facture', pl: 'ID faktury', de: 'Rechnungs-ID' },
    product_id:     { en: 'Product ID', es: 'ID Producto', ca: 'ID Producte', fr: 'ID produit', pl: 'ID produktu', de: 'Produkt-ID' },
    quantity:       { en: 'Quantity', es: 'Unidades', ca: 'Unitats', fr: 'Unités', pl: 'Jednostki', de: 'Einheiten' },
    unit_price:     { en: 'Unit Price', es: 'Precio Unitario', ca: 'Preu Unitari', fr: 'Prix unitaire', pl: 'Cena jednostkowa', de: 'Stückpreis' },
    tax_pct:        { en: 'Tax %', es: 'Impuesto %', ca: 'Impost %', fr: 'Taxe %', pl: 'Podatek %', de: 'Steuer %' },
    retention_pct:  { en: 'Retention %', es: 'Retención %', ca: 'Retenció %', fr: 'Retenue %', pl: 'Potrącenie %', de: 'Einbehalt %' },
    retention:      { en: 'Retention', es: 'Retención', ca: 'Retenció', fr: 'Retenue', pl: 'Potrącenie', de: 'Einbehalt' },

    // contacts
    code:           { en: 'Code', es: 'Código', ca: 'Codi', fr: 'Code', pl: 'Kod', de: 'Code' },
    trade_name:     { en: 'Trade Name', es: 'Nombre Comercial', ca: 'Nom Comercial', fr: 'Nom commercial', pl: 'Nazwa handlowa', de: 'Handelsname' },

    // products
    price:          { en: 'Price', es: 'Precio', ca: 'Preu', fr: 'Prix', pl: 'Cena', de: 'Preis' },
    cost:           { en: 'Cost', es: 'Coste', ca: 'Cost', fr: 'Coût', pl: 'Koszt', de: 'Kosten' },

    // ledger
    account:        { en: 'Account', es: 'Cuenta', ca: 'Compte', fr: 'Compte', pl: 'Konto', de: 'Konto' },
    tax_codes:      { en: 'Taxes', es: 'Impuestos', ca: 'Impostos', fr: 'Taxes', pl: 'Podatki', de: 'Steuern' },
    stock:          { en: 'Stock', es: 'Stock', ca: 'Estoc', fr: 'Stock', pl: 'Stan magazynowy', de: 'Bestand' },
    entry_number:   { en: 'Entry Number', es: 'Número de Asiento', ca: 'Número d\'Assentament', fr: 'Numéro d\'écriture', pl: 'Numer zapisu', de: 'Buchungsnummer' },
    line:           { en: 'Line', es: 'Línea', ca: 'Línia', fr: 'Ligne', pl: 'Linia', de: 'Zeile' },
    doc_description: { en: 'Document', es: 'Documento', ca: 'Document', fr: 'Document', pl: 'Dokument', de: 'Dokument' },
    account_name:   { en: 'Account Name', es: 'Nombre Cuenta', ca: 'Nom Compte', fr: 'Nom du compte', pl: 'Nazwa konta', de: 'Kontoname' },
    debit:          { en: 'Debit', es: 'Debe', ca: 'Deure', fr: 'Débit', pl: 'Winien', de: 'Soll' },
    credit:         { en: 'Credit', es: 'Haber', ca: 'Haver', fr: 'Crédit', pl: 'Ma', de: 'Haben' },
};

const COLUMN_DESCRIPTIONS: Record<string, Record<HoldedLocale, string>> = {
    id:             { en: 'Holded internal record identifier', es: 'Identificador interno de registro en Holded', ca: 'Identificador intern de registre a Holded', fr: 'Identifiant interne de l\'enregistrement dans Holded', pl: 'Wewnętrzny identyfikator rekordu w Holded', de: 'Interne Datensatz-ID in Holded' },
    number:         { en: 'Invoice or document number', es: 'Número de factura o documento', ca: 'Número de factura o document', fr: 'Numéro de facture ou de document', pl: 'Numer faktury lub dokumentu', de: 'Rechnungs- oder Dokumentnummer' },
    date:           { en: 'Date of the record', es: 'Fecha del registro', ca: 'Data del registre', fr: 'Date de l\'enregistrement', pl: 'Data rekordu', de: 'Datum des Datensatzes' },
    due_date:       { en: 'Payment due date', es: 'Fecha límite de pago', ca: 'Data límit de pagament', fr: 'Date limite de paiement', pl: 'Termin płatności', de: 'Zahlungsfrist' },
    contact_id:     { en: 'Contact foreign key → contacts.id', es: 'Clave foránea de contacto → contacts.id', ca: 'Clau forana de contacte → contacts.id', fr: 'Clé étrangère du contact → contacts.id', pl: 'Klucz obcy kontaktu → contacts.id', de: 'Fremdschlüssel des Kontakts → contacts.id' },
    contact:        { en: 'Contact display name', es: 'Nombre del contacto', ca: 'Nom del contacte', fr: 'Nom du contact', pl: 'Nazwa kontaktu', de: 'Name des Kontakts' },
    currency:       { en: 'Invoice currency code', es: 'Código de la divisa de la factura', ca: 'Codi de la divisa de la factura', fr: 'Code de la devise de la facture', pl: 'Kod waluty faktury', de: 'Währungscode der Rechnung' },
    subtotal:       { en: 'Amount before taxes and discounts', es: 'Importe antes de impuestos y descuentos', ca: 'Import abans d\'impostos i descomptes', fr: 'Montant avant taxes et remises', pl: 'Kwota przed podatkami i rabatami', de: 'Betrag vor Steuern und Rabatten' },
    discount:       { en: 'Discount amount or percentage', es: 'Importe o porcentaje de descuento', ca: 'Import o percentatge de descompte', fr: 'Montant ou pourcentage de remise', pl: 'Kwota lub procent rabatu', de: 'Rabattbetrag oder -prozentsatz' },
    taxes:          { en: 'Total taxes amount', es: 'Importe total de impuestos', ca: 'Import total d\'impostos', fr: 'Montant total des taxes', pl: 'Łączna kwota podatków', de: 'Gesamtbetrag der Steuern' },
    total:          { en: 'Total amount including taxes', es: 'Importe total con impuestos', ca: 'Import total amb impostos', fr: 'Montant total TTC', pl: 'Łączna kwota z podatkami', de: 'Gesamtbetrag inklusive Steuern' },
    status:         { en: 'Payment status (pending, partial, completed, cancelled)', es: 'Estado de cobro (pending, partial, completed, cancelled)', ca: 'Estat de cobrament (pending, partial, completed, cancelled)', fr: 'Statut de paiement (pending, partial, completed, cancelled)', pl: 'Status płatności (pending, partial, completed, cancelled)', de: 'Zahlungsstatus (pending, partial, completed, cancelled)' },
    paid:           { en: 'Amount already paid', es: 'Importe ya pagado', ca: 'Import ja pagat', fr: 'Montant déjà payé', pl: 'Kwota już zapłacona', de: 'Bereits bezahlter Betrag' },
    pending:        { en: 'Amount still pending payment', es: 'Importe pendiente de pago', ca: 'Import pendent de pagament', fr: 'Montant restant à payer', pl: 'Kwota pozostała do zapłaty', de: 'Noch offener Betrag' },
    invoice_id:     { en: 'Invoice foreign key → invoices.id', es: 'Clave foránea de factura → invoices.id', ca: 'Clau forana de factura → invoices.id', fr: 'Clé étrangère de la facture → invoices.id', pl: 'Klucz obcy faktury → invoices.id', de: 'Fremdschlüssel der Rechnung → invoices.id' },
    product_id:     { en: 'Product foreign key → products.id', es: 'Clave foránea de producto → products.id', ca: 'Clau forana de producte → products.id', fr: 'Clé étrangère du produit → products.id', pl: 'Klucz obcy produktu → products.id', de: 'Fremdschlüssel des Produkts → products.id' },
    name:           { en: 'Display name', es: 'Nombre de visualización', ca: 'Nom de visualització', fr: 'Nom d\'affichage', pl: 'Nazwa wyświetlana', de: 'Anzeigename' },
    sku:            { en: 'Stock keeping unit code', es: 'Código de referencia de stock', ca: 'Codi de referència d\'estoc', fr: 'Code de référence de stock', pl: 'Kod jednostki magazynowej', de: 'Lagerartikelnummer' },
    quantity:       { en: 'Quantity of units', es: 'Cantidad de unidades', ca: 'Quantitat d\'unitats', fr: 'Quantité d\'unités', pl: 'Liczba jednostek', de: 'Anzahl der Einheiten' },
    unit_price:     { en: 'Price per unit before discounts', es: 'Precio por unidad antes de descuentos', ca: 'Preu per unitat abans de descomptes', fr: 'Prix unitaire avant remises', pl: 'Cena jednostkowa przed rabatami', de: 'Stückpreis vor Rabatten' },
    tax_pct:        { en: 'Applicable tax percentage', es: 'Porcentaje de impuesto aplicable', ca: 'Percentatge d\'impost aplicable', fr: 'Pourcentage de taxe applicable', pl: 'Stawka obowiązującego podatku', de: 'Anwendbarer Steuersatz' },
    retention_pct:  { en: 'Withholding tax percentage (IRPF)', es: 'Porcentaje de retención (IRPF)', ca: 'Percentatge de retenció (IRPF)', fr: 'Pourcentage de retenue à la source (IRPF)', pl: 'Stawka podatku u źródła (IRPF)', de: 'Quellensteuersatz (IRPF)' },
    retention:      { en: 'Withholding tax amount (IRPF)', es: 'Importe de la retención (IRPF)', ca: 'Import de la retenció (IRPF)', fr: 'Montant de la retenue à la source (IRPF)', pl: 'Kwota podatku u źródła (IRPF)', de: 'Quellensteuerbetrag (IRPF)' },
    type:           { en: 'Record type or kind', es: 'Tipo o clase de registro', ca: 'Tipus o classe de registre', fr: 'Type ou nature de l\'enregistrement', pl: 'Typ lub rodzaj rekordu', de: 'Art oder Typ des Datensatzes' },
    code:           { en: 'Short identification code', es: 'Código de identificación corto', ca: 'Codi d\'identificació curt', fr: 'Code d\'identification court', pl: 'Krótki kod identyfikacyjny', de: 'Kurzer Identifikationscode' },
    trade_name:     { en: 'Commercial or trade name', es: 'Nombre comercial', ca: 'Nom comercial', fr: 'Nom commercial', pl: 'Nazwa handlowa', de: 'Handelsname' },
    email:          { en: 'Email address', es: 'Dirección de correo electrónico', ca: 'Adreça de correu electrònic', fr: 'Adresse e-mail', pl: 'Adres e-mail', de: 'E-Mail-Adresse' },
    phone:          { en: 'Phone number', es: 'Número de teléfono', ca: 'Número de telèfon', fr: 'Numéro de téléphone', pl: 'Numer telefonu', de: 'Telefonnummer' },
    mobile:         { en: 'Mobile phone number', es: 'Número de móvil', ca: 'Número de mòbil', fr: 'Numéro de mobile', pl: 'Numer telefonu komórkowego', de: 'Mobilnummer' },
    vat:            { en: 'VAT / tax identification number', es: 'NIF / número de identificación fiscal', ca: 'NIF / número d\'identificació fiscal', fr: 'Numéro de TVA / d\'identification fiscale', pl: 'NIP / numer identyfikacji podatkowej', de: 'USt-IdNr. / Steuernummer' },
    country:        { en: 'Country name or code', es: 'Nombre o código del país', ca: 'Nom o codi del país', fr: 'Nom ou code du pays', pl: 'Nazwa lub kod kraju', de: 'Name oder Code des Landes' },
    description:    { en: 'Free-text description', es: 'Descripción en texto libre', ca: 'Descripció en text lliure', fr: 'Description en texte libre', pl: 'Opis w formie dowolnego tekstu', de: 'Freitextbeschreibung' },
    price:          { en: 'Sale price', es: 'Precio de venta', ca: 'Preu de venda', fr: 'Prix de vente', pl: 'Cena sprzedaży', de: 'Verkaufspreis' },
    cost:           { en: 'Cost price', es: 'Precio de coste', ca: 'Preu de cost', fr: 'Prix de revient', pl: 'Cena kosztu', de: 'Einstandspreis' },
    category_id:    { en: 'Product category foreign key', es: 'Clave foránea de categoría', ca: 'Clau forana de categoria', fr: 'Clé étrangère de la catégorie', pl: 'Klucz obcy kategorii', de: 'Fremdschlüssel der Kategorie' },
    account:        { en: 'Accounting account code', es: 'Código de cuenta contable', ca: 'Codi de compte comptable', fr: 'Code du compte comptable', pl: 'Kod konta księgowego', de: 'Code des Buchungskontos' },
    tax_codes:      { en: 'Taxes applied to the product', es: 'Impuestos aplicados al producto', ca: 'Impostos aplicats al producte', fr: 'Taxes appliquées au produit', pl: 'Podatki zastosowane do produktu', de: 'Auf das Produkt angewandte Steuern' },
    stock:          { en: 'Units in stock', es: 'Unidades en stock', ca: 'Unitats en estoc', fr: 'Unités en stock', pl: 'Jednostki w magazynie', de: 'Einheiten auf Lager' },
    entry_number:   { en: 'Accounting entry number', es: 'Número del asiento contable', ca: 'Número de l\'assentament comptable', fr: 'Numéro de l\'écriture comptable', pl: 'Numer zapisu księgowego', de: 'Nummer der Buchung' },
    line:           { en: 'Line number within the entry', es: 'Número de línea dentro del asiento', ca: 'Número de línia dins de l\'assentament', fr: 'Numéro de ligne dans l\'écriture', pl: 'Numer linii w zapisie', de: 'Zeilennummer innerhalb der Buchung' },
    doc_description: { en: 'Description of the source document', es: 'Descripción del documento de origen', ca: 'Descripció del document d\'origen', fr: 'Description du document source', pl: 'Opis dokumentu źródłowego', de: 'Beschreibung des Ursprungsbelegs' },
    account_name:   { en: 'Accounting account name', es: 'Nombre de cuenta contable', ca: 'Nom de compte comptable', fr: 'Nom du compte comptable', pl: 'Nazwa konta księgowego', de: 'Name des Buchungskontos' },
    debit:          { en: 'Debit amount', es: 'Importe al debe', ca: 'Import al deure', fr: 'Montant au débit', pl: 'Kwota po stronie Winien', de: 'Sollbetrag' },
    credit:         { en: 'Credit amount', es: 'Importe al haber', ca: 'Import a l\'haver', fr: 'Montant au crédit', pl: 'Kwota po stronie Ma', de: 'Habenbetrag' },
};

const SUPPORTED_LOCALES: HoldedLocale[] = ['en', 'es', 'ca', 'fr', 'pl', 'de'];

export function resolveHoldedLocale(raw?: string): HoldedLocale {
    if (!raw) return 'es';
    const prefix = raw.toLowerCase().split('-')[0].split('_')[0];
    return (SUPPORTED_LOCALES as string[]).includes(prefix)
        ? (prefix as HoldedLocale)
        : 'es';
}

export function applyHoldedLabels(tables: any[], locale: HoldedLocale): void {
    for (const table of tables) {
        const tKey = table.table_name as string;
        const tDefault = TABLE_LABELS[tKey]?.[locale] ?? table.display_name?.default ?? tKey;
        const tDesc    = TABLE_DESCRIPTIONS[tKey]?.[locale] ?? tDefault;

        table.display_name = {
            default: tDefault,
            localized: SUPPORTED_LOCALES
                .filter(l => l !== locale && TABLE_LABELS[tKey]?.[l])
                .map(l => ({ locale: l, value: TABLE_LABELS[tKey][l] }))
        };
        table.description = {
            default: tDesc,
            localized: SUPPORTED_LOCALES
                .filter(l => l !== locale && TABLE_DESCRIPTIONS[tKey]?.[l])
                .map(l => ({ locale: l, value: TABLE_DESCRIPTIONS[tKey][l] }))
        };

        for (const col of table.columns) {
            const cKey     = col.column_name as string;
            const cDefault = COLUMN_LABELS[cKey]?.[locale] ?? col.display_name?.default ?? cKey;
            const cDesc    = COLUMN_DESCRIPTIONS[cKey]?.[locale] ?? cDefault;

            col.display_name = {
                default: cDefault,
                localized: SUPPORTED_LOCALES
                    .filter(l => l !== locale && COLUMN_LABELS[cKey]?.[l])
                    .map(l => ({ locale: l, value: COLUMN_LABELS[cKey][l] }))
            };
            col.description = {
                default: cDesc,
                localized: SUPPORTED_LOCALES
                    .filter(l => l !== locale && COLUMN_DESCRIPTIONS[cKey]?.[l])
                    .map(l => ({ locale: l, value: COLUMN_DESCRIPTIONS[cKey][l] }))
            };
        }
    }
}
