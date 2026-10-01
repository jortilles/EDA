export type OdooLocale = 'en' | 'es' | 'ca' | 'fr' | 'pl' | 'de';

const TABLE_LABELS: Record<string, Record<OdooLocale, string>> = {
    invoices:      { en: 'Invoices', es: 'Facturas', ca: 'Factures', fr: 'Factures', pl: 'Faktury', de: 'Rechnungen' },
    orders:        { en: 'Orders', es: 'Pedidos', ca: 'Comandes', fr: 'Commandes', pl: 'Zamówienia', de: 'Aufträge' },
    partners:      { en: 'Partners', es: 'Clientes', ca: 'Clients', fr: 'Clients', pl: 'Klienci', de: 'Kunden' },
    products:      { en: 'Products', es: 'Productos', ca: 'Productes', fr: 'Produits', pl: 'Produkty', de: 'Produkte' },
    users:         { en: 'Salespeople', es: 'Vendedores', ca: 'Venedors', fr: 'Commerciaux', pl: 'Handlowcy', de: 'Vertriebsmitarbeiter' },
};

const TABLE_DESCRIPTIONS: Record<string, Record<OdooLocale, string>> = {
    invoices:      { en: 'Posted invoices, bills and credit notes — one row per line', es: 'Facturas contabilizadas — una fila por línea', ca: 'Factures comptabilitzades — una fila per línia', fr: 'Factures comptabilisées — une ligne par ligne de document', pl: 'Zaksięgowane faktury — jeden wiersz na pozycję', de: 'Gebuchte Rechnungen — eine Zeile pro Position' },
    orders:        { en: 'Confirmed sales orders — one row per line', es: 'Pedidos de venta — una fila por línea', ca: 'Comandes de venda — una fila per línia', fr: 'Commandes de vente — une ligne par ligne de document', pl: 'Zamówienia sprzedaży — jeden wiersz na pozycję', de: 'Verkaufsaufträge — eine Zeile pro Position' },
    partners:      { en: 'Customers and suppliers', es: 'Clientes y proveedores', ca: 'Clients i proveïdors', fr: 'Clients et fournisseurs', pl: 'Klienci i dostawcy', de: 'Kunden und Lieferanten' },
    products:      { en: 'Product catalogue', es: 'Catálogo de productos', ca: 'Catàleg de productes', fr: 'Catalogue de produits', pl: 'Katalog produktów', de: 'Produktkatalog' },
    users:         { en: 'Odoo users (salespeople)', es: 'Usuarios de Odoo (vendedores)', ca: 'Usuaris d\'Odoo (venedors)', fr: 'Utilisateurs Odoo (commerciaux)', pl: 'Użytkownicy Odoo (handlowcy)', de: 'Odoo-Benutzer (Vertriebsmitarbeiter)' },
};

const COLUMN_LABELS: Record<string, Record<OdooLocale, string>> = {
    // shared
    id:               { en: 'ID', es: 'ID', ca: 'ID', fr: 'ID', pl: 'ID', de: 'ID' },
    name:             { en: 'Name', es: 'Nombre', ca: 'Nom', fr: 'Nom', pl: 'Nazwa', de: 'Name' },
    type:             { en: 'Type', es: 'Tipo', ca: 'Tipus', fr: 'Type', pl: 'Typ', de: 'Typ' },
    status:           { en: 'Status', es: 'Estado', ca: 'Estat', fr: 'Statut', pl: 'Status', de: 'Status' },
    total:            { en: 'Total', es: 'Total', ca: 'Total', fr: 'Total', pl: 'Suma', de: 'Gesamt' },
    currency:         { en: 'Currency', es: 'Moneda', ca: 'Moneda', fr: 'Devise', pl: 'Waluta', de: 'Währung' },
    company:          { en: 'Company', es: 'Empresa', ca: 'Empresa', fr: 'Société', pl: 'Firma', de: 'Unternehmen' },
    company_id:       { en: 'Company ID', es: 'ID Empresa', ca: 'ID Empresa', fr: 'ID société', pl: 'ID firmy', de: 'Unternehmens-ID' },
    email:            { en: 'Email', es: 'Email', ca: 'Email', fr: 'E-mail', pl: 'E-mail', de: 'E-Mail' },
    active:           { en: 'Active', es: 'Activo', ca: 'Actiu', fr: 'Actif', pl: 'Aktywny', de: 'Aktiv' },
    sequence:         { en: 'Sequence', es: 'Secuencia', ca: 'Seqüència', fr: 'Séquence', pl: 'Kolejność', de: 'Reihenfolge' },
    description:      { en: 'Description', es: 'Descripción', ca: 'Descripció', fr: 'Description', pl: 'Opis', de: 'Beschreibung' },
    reference:        { en: 'Reference', es: 'Referencia', ca: 'Referència', fr: 'Référence', pl: 'Referencja', de: 'Referenz' },
    internal_ref:     { en: 'Internal Reference', es: 'Referencia Interna', ca: 'Referència Interna', fr: 'Référence interne', pl: 'Referencja wewnętrzna', de: 'Interne Referenz' },
    category:         { en: 'Category', es: 'Categoría', ca: 'Categoria', fr: 'Catégorie', pl: 'Kategoria', de: 'Kategorie' },
    category_id:      { en: 'Category ID', es: 'ID Categoría', ca: 'ID Categoria', fr: 'ID catégorie', pl: 'ID kategorii', de: 'Kategorie-ID' },
    country:          { en: 'Country', es: 'País', ca: 'País', fr: 'Pays', pl: 'Kraj', de: 'Land' },
    country_id:       { en: 'Country ID', es: 'ID País', ca: 'ID País', fr: 'ID pays', pl: 'ID kraju', de: 'Länder-ID' },
    city:             { en: 'City', es: 'Ciudad', ca: 'Ciutat', fr: 'Ville', pl: 'Miasto', de: 'Stadt' },

    // invoices / orders (shared)
    line_id:          { en: 'Line ID', es: 'ID Línea', ca: 'ID Línia', fr: 'ID ligne', pl: 'ID pozycji', de: 'Positions-ID' },
    invoice_number:   { en: 'Invoice Number', es: 'Número de Factura', ca: 'Número de Factura', fr: 'Numéro de facture', pl: 'Numer faktury', de: 'Rechnungsnummer' },
    order_number:     { en: 'Order Number', es: 'Número de Pedido', ca: 'Número de Comanda', fr: 'Numéro de commande', pl: 'Numer zamówienia', de: 'Auftragsnummer' },
    partner_id:       { en: 'Partner ID', es: 'ID Cliente', ca: 'ID Client', fr: 'ID client', pl: 'ID klienta', de: 'Kunden-ID' },
    partner:          { en: 'Partner', es: 'Cliente', ca: 'Client', fr: 'Client', pl: 'Klient', de: 'Kunde' },
    salesperson_id:   { en: 'Salesperson ID', es: 'ID Vendedor', ca: 'ID Venedor', fr: 'ID commercial', pl: 'ID handlowca', de: 'Vertriebsmitarbeiter-ID' },
    salesperson:      { en: 'Salesperson', es: 'Vendedor', ca: 'Venedor', fr: 'Commercial', pl: 'Handlowiec', de: 'Vertriebsmitarbeiter' },
    order_state:      { en: 'Order State', es: 'Estado del Pedido', ca: 'Estat de la Comanda', fr: 'Statut de la commande', pl: 'Status zamówienia', de: 'Auftragsstatus' },
    tax_base:         { en: 'Tax Base', es: 'Base Imponible', ca: 'Base Imposable', fr: 'Base imposable', pl: 'Podstawa opodatkowania', de: 'Steuerbemessungsgrundlage' },
    taxes:            { en: 'Taxes', es: 'Impuestos', ca: 'Impostos', fr: 'Taxes', pl: 'Podatki', de: 'Steuern' },
    product_id:       { en: 'Product ID', es: 'ID Producto', ca: 'ID Producte', fr: 'ID produit', pl: 'ID produktu', de: 'Produkt-ID' },
    product:          { en: 'Product', es: 'Producto', ca: 'Producte', fr: 'Produit', pl: 'Produkt', de: 'Produkt' },
    quantity:         { en: 'Quantity', es: 'Cantidad', ca: 'Quantitat', fr: 'Quantité', pl: 'Ilość', de: 'Menge' },
    unit_price:       { en: 'Unit Price', es: 'Precio Unitario', ca: 'Preu Unitari', fr: 'Prix unitaire', pl: 'Cena jednostkowa', de: 'Stückpreis' },
    subtotal:         { en: 'Subtotal', es: 'Subtotal', ca: 'Subtotal', fr: 'Sous-total', pl: 'Suma częściowa', de: 'Zwischensumme' },
    total_with_taxes: { en: 'Total with Taxes', es: 'Total con Impuestos', ca: 'Total amb Impostos', fr: 'Total TTC', pl: 'Suma z podatkami', de: 'Gesamt inklusive Steuern' },
    cost_total:       { en: 'Cost Total', es: 'Coste Total', ca: 'Cost Total', fr: 'Coût total', pl: 'Koszt całkowity', de: 'Gesamtkosten' },
    margin:           { en: 'Margin', es: 'Margen Bruto', ca: 'Marge Brut', fr: 'Marge brute', pl: 'Marża brutto', de: 'Bruttomarge' },
    margin_pct:       { en: 'Margin %', es: 'Margen %', ca: 'Marge %', fr: 'Marge %', pl: 'Marża %', de: 'Marge %' },

    // invoices only
    invoice_id:       { en: 'Invoice ID', es: 'ID Factura', ca: 'ID Factura', fr: 'ID facture', pl: 'ID faktury', de: 'Rechnungs-ID' },
    invoice_date:     { en: 'Invoice Date', es: 'Fecha Factura', ca: 'Data Factura', fr: 'Date de facture', pl: 'Data faktury', de: 'Rechnungsdatum' },
    due_date:         { en: 'Due Date', es: 'Fecha Vencimiento', ca: 'Data Venciment', fr: 'Date d\'échéance', pl: 'Termin płatności', de: 'Fälligkeitsdatum' },
    journal:          { en: 'Journal', es: 'Diario', ca: 'Diari', fr: 'Journal', pl: 'Dziennik', de: 'Journal' },
    account_id:       { en: 'Account ID', es: 'ID Cuenta', ca: 'ID Compte', fr: 'ID compte', pl: 'ID konta', de: 'Konto-ID' },
    account:          { en: 'Account', es: 'Cuenta', ca: 'Compte', fr: 'Compte', pl: 'Konto', de: 'Konto' },

    // orders only
    order_id:         { en: 'Order ID', es: 'ID Pedido', ca: 'ID Comanda', fr: 'ID commande', pl: 'ID zamówienia', de: 'Auftrags-ID' },
    order_date:       { en: 'Order Date', es: 'Fecha Pedido', ca: 'Data Comanda', fr: 'Date de commande', pl: 'Data zamówienia', de: 'Auftragsdatum' },

    // products
    productname:      { en: 'Product Name', es: 'Nombre de Producto', ca: 'Nom de Producte', fr: 'Nom du produit', pl: 'Nazwa produktu', de: 'Produktname' },

    // partners
    phone:          { en: 'Phone', es: 'Teléfono', ca: 'Telèfon', fr: 'Téléphone', pl: 'Telefon', de: 'Telefon' },
    mobile:         { en: 'Mobile', es: 'Móvil', ca: 'Mòbil', fr: 'Mobile', pl: 'Telefon komórkowy', de: 'Mobiltelefon' },
    street:         { en: 'Street', es: 'Dirección', ca: 'Adreça', fr: 'Adresse', pl: 'Adres', de: 'Straße' },
    street2:        { en: 'Street 2', es: 'Dirección 2', ca: 'Adreça 2', fr: 'Adresse 2', pl: 'Adres 2', de: 'Straße 2' },
    zip:            { en: 'Zip Code', es: 'Código Postal', ca: 'Codi Postal', fr: 'Code postal', pl: 'Kod pocztowy', de: 'Postleitzahl' },
    state_id:       { en: 'State ID', es: 'ID Provincia', ca: 'ID Província', fr: 'ID province', pl: 'ID województwa', de: 'Bundesland-ID' },
    state:          { en: 'State', es: 'Provincia', ca: 'Província', fr: 'Province', pl: 'Województwo', de: 'Bundesland' },
    vat:            { en: 'VAT Number', es: 'NIF', ca: 'NIF', fr: 'Numéro de TVA', pl: 'NIP', de: 'USt-IdNr.' },
    is_company:     { en: 'Is Company', es: 'Es Empresa', ca: 'És Empresa', fr: 'Est une société', pl: 'Jest firmą', de: 'Ist Unternehmen' },
    is_customer:    { en: 'Customer Rank', es: 'Es Cliente', ca: 'És Client', fr: 'Rang client', pl: 'Ranga klienta', de: 'Kundenrang' },
    is_supplier:    { en: 'Supplier Rank', es: 'Es Proveedor', ca: 'És Proveïdor', fr: 'Rang fournisseur', pl: 'Ranga dostawcy', de: 'Lieferantenrang' },

    // products
    sale_description: { en: 'Sale Description', es: 'Descripción de Venta', ca: 'Descripció de Venda', fr: 'Description de vente', pl: 'Opis sprzedaży', de: 'Verkaufsbeschreibung' },
    sale_price:       { en: 'Sale Price', es: 'Precio de Venta', ca: 'Preu de Venda', fr: 'Prix de vente', pl: 'Cena sprzedaży', de: 'Verkaufspreis' },
    cost_price:       { en: 'Cost Price', es: 'Precio de Coste', ca: 'Preu de Cost', fr: 'Prix de revient', pl: 'Cena kosztu', de: 'Einstandspreis' },
    uom_id:           { en: 'Unit of Measure ID', es: 'ID Unidad Medida', ca: 'ID Unitat Mesura', fr: 'ID unité de mesure', pl: 'ID jednostki miary', de: 'Maßeinheit-ID' },
    uom:              { en: 'Unit of Measure', es: 'Unidad de Medida', ca: 'Unitat de Mesura', fr: 'Unité de mesure', pl: 'Jednostka miary', de: 'Maßeinheit' },
    barcode:          { en: 'Barcode', es: 'Código de Barras', ca: 'Codi de Barres', fr: 'Code-barres', pl: 'Kod kreskowy', de: 'Barcode' },
    template_id:      { en: 'Template ID', es: 'ID Plantilla', ca: 'ID Plantilla', fr: 'ID modèle', pl: 'ID szablonu', de: 'Vorlagen-ID' },

    // users
    login:          { en: 'Login', es: 'Login', ca: 'Login', fr: 'Identifiant', pl: 'Login', de: 'Login' },
    external_user:  { en: 'External User', es: 'Usuario Externo', ca: 'Usuari Extern', fr: 'Utilisateur externe', pl: 'Użytkownik zewnętrzny', de: 'Externer Benutzer' },
};

const COLUMN_DESCRIPTIONS: Record<string, Record<OdooLocale, string>> = {
    id:               { en: 'Odoo internal record identifier', es: 'Identificador interno de registro en Odoo', ca: 'Identificador intern de registre a Odoo', fr: 'Identifiant interne de l\'enregistrement dans Odoo', pl: 'Wewnętrzny identyfikator rekordu w Odoo', de: 'Interne Datensatz-ID in Odoo' },
    name:             { en: 'Display name', es: 'Nombre de visualización', ca: 'Nom de visualització', fr: 'Nom d\'affichage', pl: 'Nazwa wyświetlana', de: 'Anzeigename' },
    line_id:          { en: 'Unique identifier of the document line', es: 'Identificador único de la línea del documento', ca: 'Identificador únic de la línia del document', fr: 'Identifiant unique de la ligne du document', pl: 'Unikalny identyfikator pozycji dokumentu', de: 'Eindeutige ID der Dokumentposition' },
    invoice_number:   { en: 'Invoice number', es: 'Número de factura', ca: 'Número de factura', fr: 'Numéro de facture', pl: 'Numer faktury', de: 'Rechnungsnummer' },
    order_number:     { en: 'Order number', es: 'Número de pedido', ca: 'Número de comanda', fr: 'Numéro de commande', pl: 'Numer zamówienia', de: 'Auftragsnummer' },
    partner_id:       { en: 'Partner foreign key → partners.id', es: 'Clave foránea de cliente → partners.id', ca: 'Clau forana de client → partners.id', fr: 'Clé étrangère du client → partners.id', pl: 'Klucz obcy klienta → partners.id', de: 'Fremdschlüssel des Kunden → partners.id' },
    partner:          { en: 'Partner display name', es: 'Nombre del cliente', ca: 'Nom del client', fr: 'Nom du client', pl: 'Nazwa klienta', de: 'Name des Kunden' },
    salesperson_id:   { en: 'Salesperson foreign key → users.id', es: 'Clave foránea de vendedor → users.id', ca: 'Clau forana de venedor → users.id', fr: 'Clé étrangère du commercial → users.id', pl: 'Klucz obcy handlowca → users.id', de: 'Fremdschlüssel des Vertriebsmitarbeiters → users.id' },
    salesperson:      { en: 'Salesperson display name', es: 'Nombre del vendedor', ca: 'Nom del venedor', fr: 'Nom du commercial', pl: 'Nazwa handlowca', de: 'Name des Vertriebsmitarbeiters' },
    order_state:      { en: 'Order state (draft, sale, done, cancel)', es: 'Estado del pedido (draft, sale, done, cancel)', ca: 'Estat de la comanda (draft, sale, done, cancel)', fr: 'Statut de la commande (draft, sale, done, cancel)', pl: 'Status zamówienia (draft, sale, done, cancel)', de: 'Auftragsstatus (draft, sale, done, cancel)' },
    type:             { en: 'Move type (out_invoice, in_invoice…)', es: 'Tipo de movimiento (out_invoice, in_invoice…)', ca: 'Tipus de moviment (out_invoice, in_invoice…)', fr: 'Type de mouvement (out_invoice, in_invoice…)', pl: 'Typ ruchu (out_invoice, in_invoice…)', de: 'Buchungsart (out_invoice, in_invoice…)' },
    status:           { en: 'Document state (posted, draft…)', es: 'Estado del documento (posted, draft…)', ca: 'Estat del document (posted, draft…)', fr: 'Statut du document (posted, draft…)', pl: 'Status dokumentu (posted, draft…)', de: 'Dokumentstatus (posted, draft…)' },
    tax_base:         { en: 'Amount before taxes', es: 'Importe antes de impuestos', ca: 'Import abans d\'impostos', fr: 'Montant hors taxes', pl: 'Kwota przed podatkami', de: 'Betrag vor Steuern' },
    taxes:            { en: 'Tax amount', es: 'Importe de impuestos', ca: 'Import d\'impostos', fr: 'Montant des taxes', pl: 'Kwota podatku', de: 'Steuerbetrag' },
    total:            { en: 'Total amount including taxes', es: 'Importe total con impuestos', ca: 'Import total amb impostos', fr: 'Montant total TTC', pl: 'Łączna kwota z podatkami', de: 'Gesamtbetrag inklusive Steuern' },
    currency:         { en: 'Currency name', es: 'Nombre de la moneda', ca: 'Nom de la moneda', fr: 'Nom de la devise', pl: 'Nazwa waluty', de: 'Name der Währung' },
    journal:          { en: 'Accounting journal', es: 'Diario contable', ca: 'Diari comptable', fr: 'Journal comptable', pl: 'Dziennik księgowy', de: 'Buchungsjournal' },
    company:          { en: 'Company name', es: 'Nombre de la empresa', ca: 'Nom de l\'empresa', fr: 'Nom de la société', pl: 'Nazwa firmy', de: 'Name des Unternehmens' },
    reference:        { en: 'Vendor reference or purchase order number', es: 'Referencia del proveedor o número de pedido', ca: 'Referència del proveïdor o número de comanda', fr: 'Référence fournisseur ou numéro de commande', pl: 'Referencja dostawcy lub numer zamówienia', de: 'Lieferantenreferenz oder Bestellnummer' },
    invoice_id:       { en: 'Invoice foreign key → invoices.id', es: 'Clave foránea de factura → invoices.id', ca: 'Clau forana de factura → invoices.id', fr: 'Clé étrangère de la facture → invoices.id', pl: 'Klucz obcy faktury → invoices.id', de: 'Fremdschlüssel der Rechnung → invoices.id' },
    invoice_date:     { en: 'Date the invoice was issued', es: 'Fecha de emisión de la factura', ca: 'Data d\'emissió de la factura', fr: 'Date d\'émission de la facture', pl: 'Data wystawienia faktury', de: 'Ausstellungsdatum der Rechnung' },
    due_date:         { en: 'Payment due date', es: 'Fecha límite de pago', ca: 'Data límit de pagament', fr: 'Date limite de paiement', pl: 'Termin płatności', de: 'Zahlungsfrist' },
    order_id:         { en: 'Order foreign key → orders.id', es: 'Clave foránea de pedido → orders.id', ca: 'Clau forana de comanda → orders.id', fr: 'Clé étrangère de la commande → orders.id', pl: 'Klucz obcy zamówienia → orders.id', de: 'Fremdschlüssel des Auftrags → orders.id' },
    order_date:       { en: 'Date the order was confirmed', es: 'Fecha de confirmación del pedido', ca: 'Data de confirmació de la comanda', fr: 'Date de confirmation de la commande', pl: 'Data potwierdzenia zamówienia', de: 'Bestätigungsdatum des Auftrags' },
    product_id:       { en: 'Product foreign key → products.id', es: 'Clave foránea de producto → products.id', ca: 'Clau forana de producte → products.id', fr: 'Clé étrangère du produit → products.id', pl: 'Klucz obcy produktu → products.id', de: 'Fremdschlüssel des Produkts → products.id' },
    product:          { en: 'Product display name', es: 'Nombre del producto', ca: 'Nom del producte', fr: 'Nom du produit', pl: 'Nazwa produktu', de: 'Name des Produkts' },
    description:      { en: 'Line description', es: 'Descripción de la línea', ca: 'Descripció de la línia', fr: 'Description de la ligne', pl: 'Opis pozycji', de: 'Beschreibung der Position' },
    quantity:         { en: 'Quantity ordered or invoiced', es: 'Cantidad pedida o facturada', ca: 'Quantitat demanada o facturada', fr: 'Quantité commandée ou facturée', pl: 'Ilość zamówiona lub zafakturowana', de: 'Bestellte oder berechnete Menge' },
    unit_price:       { en: 'Price per unit before discount', es: 'Precio por unidad antes de descuento', ca: 'Preu per unitat abans de descompte', fr: 'Prix unitaire avant remise', pl: 'Cena jednostkowa przed rabatem', de: 'Stückpreis vor Rabatt' },
    subtotal:         { en: 'Subtotal excluding taxes', es: 'Subtotal sin impuestos', ca: 'Subtotal sense impostos', fr: 'Sous-total hors taxes', pl: 'Suma częściowa bez podatków', de: 'Zwischensumme ohne Steuern' },
    total_with_taxes: { en: 'Total including taxes', es: 'Total con impuestos', ca: 'Total amb impostos', fr: 'Total TTC', pl: 'Suma z podatkami', de: 'Gesamt inklusive Steuern' },
    cost_total:       { en: 'Total cost (unit cost × quantity)', es: 'Coste total (coste unitario × cantidad)', ca: 'Cost total (cost unitari × quantitat)', fr: 'Coût total (coût unitaire × quantité)', pl: 'Koszt całkowity (koszt jednostkowy × ilość)', de: 'Gesamtkosten (Stückkosten × Menge)' },
    margin:           { en: 'Gross margin (subtotal − cost total)', es: 'Margen bruto (subtotal − coste total)', ca: 'Marge brut (subtotal − cost total)', fr: 'Marge brute (sous-total − coût total)', pl: 'Marża brutto (suma częściowa − koszt całkowity)', de: 'Bruttomarge (Zwischensumme − Gesamtkosten)' },
    margin_pct:       { en: 'Margin percentage over subtotal', es: 'Porcentaje de margen sobre subtotal', ca: 'Percentatge de marge sobre el subtotal', fr: 'Pourcentage de marge sur le sous-total', pl: 'Procent marży od sumy częściowej', de: 'Margenanteil an der Zwischensumme' },
    account_id:       { en: 'Accounting account ID', es: 'ID de la cuenta contable', ca: 'ID del compte comptable', fr: 'ID du compte comptable', pl: 'ID konta księgowego', de: 'ID des Buchungskontos' },
    account:          { en: 'Accounting account name', es: 'Nombre de la cuenta contable', ca: 'Nom del compte comptable', fr: 'Nom du compte comptable', pl: 'Nazwa konta księgowego', de: 'Name des Buchungskontos' },
    sequence:         { en: 'Display order within the document', es: 'Orden de visualización dentro del documento', ca: 'Ordre de visualització dins del document', fr: 'Ordre d\'affichage dans le document', pl: 'Kolejność wyświetlania w dokumencie', de: 'Anzeigereihenfolge im Dokument' },
    productname:      { en: 'Product display name', es: 'Nombre del producto', ca: 'Nom del producte', fr: 'Nom du produit', pl: 'Nazwa produktu', de: 'Name des Produkts' },
    phone:            { en: 'Phone number', es: 'Número de teléfono', ca: 'Número de telèfon', fr: 'Numéro de téléphone', pl: 'Numer telefonu', de: 'Telefonnummer' },
    mobile:           { en: 'Mobile phone number', es: 'Número de móvil', ca: 'Número de mòbil', fr: 'Numéro de mobile', pl: 'Numer telefonu komórkowego', de: 'Mobilnummer' },
    street:           { en: 'Main address line', es: 'Línea principal de la dirección', ca: 'Línia principal de l\'adreça', fr: 'Ligne principale de l\'adresse', pl: 'Główna linia adresu', de: 'Hauptadresszeile' },
    street2:          { en: 'Additional address line', es: 'Línea adicional de la dirección', ca: 'Línia addicional de l\'adreça', fr: 'Ligne d\'adresse complémentaire', pl: 'Dodatkowa linia adresu', de: 'Zusätzliche Adresszeile' },
    city:             { en: 'City', es: 'Ciudad', ca: 'Ciutat', fr: 'Ville', pl: 'Miasto', de: 'Stadt' },
    zip:              { en: 'Postal / ZIP code', es: 'Código postal', ca: 'Codi postal', fr: 'Code postal', pl: 'Kod pocztowy', de: 'Postleitzahl' },
    country_id:       { en: 'Country foreign key', es: 'Clave foránea de país', ca: 'Clau forana de país', fr: 'Clé étrangère du pays', pl: 'Klucz obcy kraju', de: 'Fremdschlüssel des Landes' },
    country:          { en: 'Country name', es: 'Nombre del país', ca: 'Nom del país', fr: 'Nom du pays', pl: 'Nazwa kraju', de: 'Name des Landes' },
    state_id:         { en: 'State / province foreign key', es: 'Clave foránea de provincia', ca: 'Clau forana de província', fr: 'Clé étrangère de la province', pl: 'Klucz obcy województwa', de: 'Fremdschlüssel des Bundeslands' },
    state:            { en: 'State / province name', es: 'Nombre de la provincia', ca: 'Nom de la província', fr: 'Nom de la province', pl: 'Nazwa województwa', de: 'Name des Bundeslands' },
    vat:              { en: 'VAT / tax identification number', es: 'NIF / número de identificación fiscal', ca: 'NIF / número d\'identificació fiscal', fr: 'Numéro de TVA / d\'identification fiscale', pl: 'NIP / numer identyfikacji podatkowej', de: 'USt-IdNr. / Steuernummer' },
    internal_ref:     { en: 'Internal reference code', es: 'Código de referencia interna', ca: 'Codi de referència interna', fr: 'Code de référence interne', pl: 'Kod referencji wewnętrznej', de: 'Interner Referenzcode' },
    company_id:       { en: 'Parent company foreign key', es: 'Clave foránea de empresa matriz', ca: 'Clau forana de l\'empresa matriu', fr: 'Clé étrangère de la société mère', pl: 'Klucz obcy firmy nadrzędnej', de: 'Fremdschlüssel der Muttergesellschaft' },
    is_company:       { en: '1 if the partner is a company', es: '1 si el contacto es una empresa', ca: '1 si el contacte és una empresa', fr: '1 si le contact est une société', pl: '1, jeśli kontakt jest firmą', de: '1, wenn der Kontakt ein Unternehmen ist' },
    is_customer:      { en: 'Customer rank (purchases count)', es: 'Rango como cliente (nº de compras)', ca: 'Rang com a client (nre. de compres)', fr: 'Rang client (nombre d\'achats)', pl: 'Ranga klienta (liczba zakupów)', de: 'Kundenrang (Anzahl der Käufe)' },
    is_supplier:      { en: 'Supplier rank (bills count)', es: 'Rango como proveedor (nº de facturas recibidas)', ca: 'Rang com a proveïdor (nre. de factures rebudes)', fr: 'Rang fournisseur (nombre de factures reçues)', pl: 'Ranga dostawcy (liczba otrzymanych faktur)', de: 'Lieferantenrang (Anzahl erhaltener Rechnungen)' },
    sale_description: { en: 'Description shown on sales orders', es: 'Descripción que aparece en pedidos de venta', ca: 'Descripció que apareix a les comandes de venda', fr: 'Description affichée sur les commandes de vente', pl: 'Opis wyświetlany w zamówieniach sprzedaży', de: 'Beschreibung auf Verkaufsaufträgen' },
    sale_price:       { en: 'Public sale price', es: 'Precio de venta al público', ca: 'Preu de venda al públic', fr: 'Prix de vente public', pl: 'Cena detaliczna', de: 'Öffentlicher Verkaufspreis' },
    cost_price:       { en: 'Internal cost price', es: 'Precio de coste interno', ca: 'Preu de cost intern', fr: 'Prix de revient interne', pl: 'Wewnętrzna cena kosztu', de: 'Interner Einstandspreis' },
    category_id:      { en: 'Product category foreign key', es: 'Clave foránea de categoría de producto', ca: 'Clau forana de categoria de producte', fr: 'Clé étrangère de la catégorie de produit', pl: 'Klucz obcy kategorii produktu', de: 'Fremdschlüssel der Produktkategorie' },
    category:         { en: 'Product category name', es: 'Nombre de la categoría de producto', ca: 'Nom de la categoria de producte', fr: 'Nom de la catégorie de produit', pl: 'Nazwa kategorii produktu', de: 'Name der Produktkategorie' },
    uom_id:           { en: 'Unit of measure foreign key', es: 'Clave foránea de unidad de medida', ca: 'Clau forana d\'unitat de mesura', fr: 'Clé étrangère de l\'unité de mesure', pl: 'Klucz obcy jednostki miary', de: 'Fremdschlüssel der Maßeinheit' },
    uom:              { en: 'Unit of measure name', es: 'Nombre de la unidad de medida', ca: 'Nom de la unitat de mesura', fr: 'Nom de l\'unité de mesure', pl: 'Nazwa jednostki miary', de: 'Name der Maßeinheit' },
    barcode:          { en: 'EAN / barcode', es: 'EAN / código de barras', ca: 'EAN / codi de barres', fr: 'EAN / code-barres', pl: 'EAN / kod kreskowy', de: 'EAN / Barcode' },
    active:           { en: '1 if the record is active', es: '1 si el registro está activo', ca: '1 si el registre està actiu', fr: '1 si l\'enregistrement est actif', pl: '1, jeśli rekord jest aktywny', de: '1, wenn der Datensatz aktiv ist' },
    template_id:      { en: 'Product template foreign key', es: 'Clave foránea de la plantilla de producto', ca: 'Clau forana de la plantilla de producte', fr: 'Clé étrangère du modèle de produit', pl: 'Klucz obcy szablonu produktu', de: 'Fremdschlüssel der Produktvorlage' },
    login:            { en: 'Odoo login username', es: 'Nombre de usuario en Odoo', ca: 'Nom d\'usuari a Odoo', fr: 'Identifiant de connexion Odoo', pl: 'Nazwa użytkownika w Odoo', de: 'Odoo-Anmeldename' },
    email:            { en: 'Email address', es: 'Dirección de correo electrónico', ca: 'Adreça de correu electrònic', fr: 'Adresse e-mail', pl: 'Adres e-mail', de: 'E-Mail-Adresse' },
    external_user:    { en: '1 if the user is an external/portal user', es: '1 si el usuario es externo/portal', ca: '1 si l\'usuari és extern/portal', fr: '1 si l\'utilisateur est externe/portail', pl: '1, jeśli użytkownik jest zewnętrzny/portalowy', de: '1, wenn der Benutzer extern/Portalbenutzer ist' },
};

/** Supported Odoo locales — add entries here to expand language coverage. */
const SUPPORTED_LOCALES: OdooLocale[] = ['en', 'es', 'ca', 'fr', 'pl', 'de'];

export function resolveOdooLocale(raw?: string): OdooLocale {
    if (!raw) return 'es';
    const prefix = raw.toLowerCase().split('-')[0].split('_')[0];
    return (SUPPORTED_LOCALES as string[]).includes(prefix)
        ? (prefix as OdooLocale)
        : 'es';
}

/**
 * Applies Odoo-specific localised display_name and description to a tables array
 * generated by DuckDBConnection.generateDataModel().
 * Also stores all available translations in the localized[] array.
 */
export function applyOdooLabels(tables: any[], locale: OdooLocale): void {
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

            if (cKey === 'id' || cKey.endsWith('_id')) {
                col.visible = false;
            }

            if (col.column_type === 'numeric') {
                col.minimumFractionDigits = 2;
            }
        }
    }
}
