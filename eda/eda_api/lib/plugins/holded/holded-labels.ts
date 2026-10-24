export type HoldedLocale = 'en' | 'es' | 'ca' | 'fr' | 'pl' | 'de' | 'pt';

type LocalizedText = Record<HoldedLocale, string>;

const TABLE_LABELS: Record<string, LocalizedText> = {
    invoices:      { en: 'Invoices', es: 'Facturas', ca: 'Factures', fr: 'Factures', pl: 'Faktury', de: 'Rechnungen', pt: 'Faturas' },
    invoice_lines: { en: 'Invoice Lines', es: 'Líneas de Factura', ca: 'Línies de Factura', fr: 'Lignes de facture', pl: 'Pozycje faktur', de: 'Rechnungspositionen', pt: 'Linhas de fatura' },
    contacts:      { en: 'Contacts', es: 'Contactos', ca: 'Contactes', fr: 'Contacts', pl: 'Kontakty', de: 'Kontakte', pt: 'Contactos' },
    products:      { en: 'Products', es: 'Productos', ca: 'Productes', fr: 'Produits', pl: 'Produkty', de: 'Produkte', pt: 'Produtos' },
    ledger:        { en: 'Ledger', es: 'Asientos Contables', ca: 'Assentaments Comptables', fr: 'Écritures comptables', pl: 'Zapisy księgowe', de: 'Buchungssätze', pt: 'Lançamentos contabilísticos' },
};

const TABLE_DESCRIPTIONS: Record<string, LocalizedText> = {
    invoices:      { en: 'Holded invoices and their summary', es: 'Facturas de Holded y su resumen', ca: 'Factures de Holded i el seu resum', fr: 'Factures Holded et leur résumé', pl: 'Faktury z Holded i ich podsumowanie', de: 'Holded-Rechnungen und ihre Übersicht', pt: 'Faturas do Holded e o respetivo resumo' },
    invoice_lines: { en: 'Line items detail for each invoice', es: 'Líneas de detalle de cada factura', ca: 'Línies de detall de cada factura', fr: 'Lignes de détail de chaque facture', pl: 'Pozycje szczegółowe każdej faktury', de: 'Detailpositionen jeder Rechnung', pt: 'Linhas de detalhe de cada fatura' },
    contacts:      { en: 'Customers and suppliers from Holded', es: 'Clientes y proveedores de Holded', ca: 'Clients i proveïdors de Holded', fr: 'Clients et fournisseurs de Holded', pl: 'Klienci i dostawcy z Holded', de: 'Kunden und Lieferanten aus Holded', pt: 'Clientes e fornecedores do Holded' },
    products:      { en: 'Product catalogue from Holded', es: 'Catálogo de productos de Holded', ca: 'Catàleg de productes de Holded', fr: 'Catalogue de produits de Holded', pl: 'Katalog produktów z Holded', de: 'Produktkatalog aus Holded', pt: 'Catálogo de produtos do Holded' },
    ledger:        { en: 'Daily accounting ledger entries', es: 'Asientos del libro diario contable', ca: 'Assentaments del llibre diari comptable', fr: 'Écritures du journal comptable', pl: 'Zapisy dziennika księgowego', de: 'Buchungen des Journals', pt: 'Lançamentos do diário contabilístico' },
};

// Labels shared by several tables (same concept wherever they appear)
const INVOICE_ID_LABEL:   LocalizedText = { en: 'Invoice ID', es: 'ID Factura', ca: 'ID Factura', fr: 'ID facture', pl: 'ID faktury', de: 'Rechnungs-ID', pt: 'ID fatura' };
const CONTACT_ID_LABEL:   LocalizedText = { en: 'Contact ID', es: 'ID Contacto', ca: 'ID Contacte', fr: 'ID contact', pl: 'ID kontaktu', de: 'Kontakt-ID', pt: 'ID contacto' };
const CONTACT_NAME_LABEL: LocalizedText = { en: 'Contact Name', es: 'Nombre de Contacto', ca: 'Nom de Contacte', fr: 'Nom du contact', pl: 'Nazwa kontaktu', de: 'Kontaktname', pt: 'Nome do contacto' };
const PRODUCT_ID_LABEL:   LocalizedText = { en: 'Product ID', es: 'ID Producto', ca: 'ID Producte', fr: 'ID produit', pl: 'ID produktu', de: 'Produkt-ID', pt: 'ID produto' };
const PRODUCT_NAME_LABEL: LocalizedText = { en: 'Product Name', es: 'Nombre de Producto', ca: 'Nom de Producte', fr: 'Nom du produit', pl: 'Nazwa produktu', de: 'Produktname', pt: 'Nome do produto' };
const PRODUCT_SKU_LABEL:  LocalizedText = { en: 'Product SKU', es: 'SKU de Producto', ca: 'SKU de Producte', fr: 'SKU du produit', pl: 'SKU produktu', de: 'Produkt-SKU', pt: 'SKU do produto' };

// Column labels per table: the same column name (name, status, total...) means
// different things in each table, so every label names its entity explicitly
const COLUMN_LABELS: Record<string, Record<string, LocalizedText>> = {
    invoices: {
        id:          INVOICE_ID_LABEL,
        number:      { en: 'Invoice Number', es: 'Número de Factura', ca: 'Número de Factura', fr: 'Numéro de facture', pl: 'Numer faktury', de: 'Rechnungsnummer', pt: 'Número da fatura' },
        date:        { en: 'Invoice Date', es: 'Fecha de Factura', ca: 'Data de Factura', fr: 'Date de facture', pl: 'Data faktury', de: 'Rechnungsdatum', pt: 'Data da fatura' },
        due_date:    { en: 'Invoice Due Date', es: 'Fecha de Vencimiento de Factura', ca: 'Data de Venciment de Factura', fr: 'Date d\'échéance de la facture', pl: 'Termin płatności faktury', de: 'Fälligkeitsdatum der Rechnung', pt: 'Data de vencimento da fatura' },
        contact_id:  CONTACT_ID_LABEL,
        contact:     CONTACT_NAME_LABEL,
        description: { en: 'Invoice Description', es: 'Descripción de Factura', ca: 'Descripció de Factura', fr: 'Description de la facture', pl: 'Opis faktury', de: 'Rechnungsbeschreibung', pt: 'Descrição da fatura' },
        currency:    { en: 'Invoice Currency', es: 'Divisa de Factura', ca: 'Divisa de Factura', fr: 'Devise de la facture', pl: 'Waluta faktury', de: 'Rechnungswährung', pt: 'Moeda da fatura' },
        subtotal:    { en: 'Invoice Subtotal', es: 'Subtotal de Factura', ca: 'Subtotal de Factura', fr: 'Sous-total de la facture', pl: 'Suma częściowa faktury', de: 'Rechnungszwischensumme', pt: 'Subtotal da fatura' },
        discount:    { en: 'Invoice Discount', es: 'Descuento de Factura', ca: 'Descompte de Factura', fr: 'Remise de la facture', pl: 'Rabat faktury', de: 'Rechnungsrabatt', pt: 'Desconto da fatura' },
        taxes:       { en: 'Invoice Taxes', es: 'Impuestos de Factura', ca: 'Impostos de Factura', fr: 'Taxes de la facture', pl: 'Podatki faktury', de: 'Rechnungssteuern', pt: 'Impostos da fatura' },
        total:       { en: 'Invoice Total', es: 'Total de Factura', ca: 'Total de Factura', fr: 'Total de la facture', pl: 'Suma faktury', de: 'Rechnungsbetrag', pt: 'Total da fatura' },
        status:      { en: 'Invoice Status', es: 'Estado de Factura', ca: 'Estat de Factura', fr: 'Statut de la facture', pl: 'Status faktury', de: 'Rechnungsstatus', pt: 'Estado da fatura' },
        paid:        { en: 'Invoice Paid Amount', es: 'Importe Pagado de Factura', ca: 'Import Pagat de Factura', fr: 'Montant payé de la facture', pl: 'Kwota zapłacona faktury', de: 'Bezahlter Rechnungsbetrag', pt: 'Montante pago da fatura' },
        pending:     { en: 'Invoice Pending Amount', es: 'Importe Pendiente de Factura', ca: 'Import Pendent de Factura', fr: 'Montant restant de la facture', pl: 'Kwota do zapłaty faktury', de: 'Offener Rechnungsbetrag', pt: 'Montante pendente da fatura' },
    },
    invoice_lines: {
        id:            { en: 'Invoice Line ID', es: 'ID Línea de Factura', ca: 'ID Línia de Factura', fr: 'ID ligne de facture', pl: 'ID pozycji faktury', de: 'Rechnungspositions-ID', pt: 'ID linha de fatura' },
        invoice_id:    INVOICE_ID_LABEL,
        product_id:    PRODUCT_ID_LABEL,
        name:          PRODUCT_NAME_LABEL,
        description:   { en: 'Invoice Line Description', es: 'Descripción de Línea de Factura', ca: 'Descripció de Línia de Factura', fr: 'Description de la ligne de facture', pl: 'Opis pozycji faktury', de: 'Beschreibung der Rechnungsposition', pt: 'Descrição da linha de fatura' },
        sku:           PRODUCT_SKU_LABEL,
        quantity:      { en: 'Invoice Line Quantity', es: 'Unidades de Línea de Factura', ca: 'Unitats de Línia de Factura', fr: 'Unités de la ligne de facture', pl: 'Ilość w pozycji faktury', de: 'Menge der Rechnungsposition', pt: 'Unidades da linha de fatura' },
        unit_price:    { en: 'Invoice Line Unit Price', es: 'Precio Unitario de Línea de Factura', ca: 'Preu Unitari de Línia de Factura', fr: 'Prix unitaire de la ligne de facture', pl: 'Cena jednostkowa pozycji faktury', de: 'Stückpreis der Rechnungsposition', pt: 'Preço unitário da linha de fatura' },
        discount:      { en: 'Invoice Line Discount %', es: 'Descuento de Línea de Factura %', ca: 'Descompte de Línia de Factura %', fr: 'Remise de la ligne de facture %', pl: 'Rabat pozycji faktury %', de: 'Rabatt der Rechnungsposition %', pt: 'Desconto da linha de fatura %' },
        subtotal:      { en: 'Invoice Line Subtotal', es: 'Subtotal de Línea de Factura', ca: 'Subtotal de Línia de Factura', fr: 'Sous-total de la ligne de facture', pl: 'Suma częściowa pozycji faktury', de: 'Zwischensumme der Rechnungsposition', pt: 'Subtotal da linha de fatura' },
        total:         { en: 'Invoice Line Total', es: 'Total de Línea de Factura', ca: 'Total de Línia de Factura', fr: 'Total de la ligne de facture', pl: 'Suma pozycji faktury', de: 'Gesamtbetrag der Rechnungsposition', pt: 'Total da linha de fatura' },
        tax_pct:       { en: 'Invoice Line Tax %', es: 'Impuesto de Línea de Factura %', ca: 'Impost de Línia de Factura %', fr: 'Taxe de la ligne de facture %', pl: 'Podatek pozycji faktury %', de: 'Steuer der Rechnungsposition %', pt: 'Imposto da linha de fatura %' },
        account:       { en: 'Invoice Line Account', es: 'Cuenta Contable de Línea de Factura', ca: 'Compte Comptable de Línia de Factura', fr: 'Compte comptable de la ligne de facture', pl: 'Konto księgowe pozycji faktury', de: 'Buchungskonto der Rechnungsposition', pt: 'Conta contabilística da linha de fatura' },
        retention_pct: { en: 'Invoice Line Retention %', es: 'Retención de Línea de Factura %', ca: 'Retenció de Línia de Factura %', fr: 'Retenue de la ligne de facture %', pl: 'Potrącenie pozycji faktury %', de: 'Einbehalt der Rechnungsposition %', pt: 'Retenção da linha de fatura %' },
        retention:     { en: 'Invoice Line Retention', es: 'Retención de Línea de Factura', ca: 'Retenció de Línia de Factura', fr: 'Retenue de la ligne de facture', pl: 'Potrącenie pozycji faktury', de: 'Einbehalt der Rechnungsposition', pt: 'Retenção da linha de fatura' },
    },
    contacts: {
        id:         CONTACT_ID_LABEL,
        code:       { en: 'Contact Code', es: 'Código de Contacto', ca: 'Codi de Contacte', fr: 'Code du contact', pl: 'Kod kontaktu', de: 'Kontaktcode', pt: 'Código do contacto' },
        name:       CONTACT_NAME_LABEL,
        trade_name: { en: 'Contact Trade Name', es: 'Nombre Comercial de Contacto', ca: 'Nom Comercial de Contacte', fr: 'Nom commercial du contact', pl: 'Nazwa handlowa kontaktu', de: 'Handelsname des Kontakts', pt: 'Nome comercial do contacto' },
        email:      { en: 'Contact Email', es: 'Email de Contacto', ca: 'Email de Contacte', fr: 'E-mail du contact', pl: 'E-mail kontaktu', de: 'E-Mail des Kontakts', pt: 'Email do contacto' },
        phone:      { en: 'Contact Phone', es: 'Teléfono de Contacto', ca: 'Telèfon de Contacte', fr: 'Téléphone du contact', pl: 'Telefon kontaktu', de: 'Telefon des Kontakts', pt: 'Telefone do contacto' },
        mobile:     { en: 'Contact Mobile', es: 'Móvil de Contacto', ca: 'Mòbil de Contacte', fr: 'Mobile du contact', pl: 'Telefon komórkowy kontaktu', de: 'Mobiltelefon des Kontakts', pt: 'Telemóvel do contacto' },
        type:       { en: 'Contact Type', es: 'Tipo de Contacto', ca: 'Tipus de Contacte', fr: 'Type de contact', pl: 'Typ kontaktu', de: 'Kontakttyp', pt: 'Tipo de contacto' },
        vat:        { en: 'Contact VAT Number', es: 'NIF de Contacto', ca: 'NIF de Contacte', fr: 'Numéro de TVA du contact', pl: 'NIP kontaktu', de: 'USt-IdNr. des Kontakts', pt: 'NIF do contacto' },
        country:    { en: 'Contact Country', es: 'País de Contacto', ca: 'País de Contacte', fr: 'Pays du contact', pl: 'Kraj kontaktu', de: 'Land des Kontakts', pt: 'País do contacto' },
    },
    products: {
        id:          PRODUCT_ID_LABEL,
        name:        PRODUCT_NAME_LABEL,
        description: { en: 'Product Description', es: 'Descripción de Producto', ca: 'Descripció de Producte', fr: 'Description du produit', pl: 'Opis produktu', de: 'Produktbeschreibung', pt: 'Descrição do produto' },
        price:       { en: 'Product Sale Price', es: 'Precio de Venta de Producto', ca: 'Preu de Venda de Producte', fr: 'Prix de vente du produit', pl: 'Cena sprzedaży produktu', de: 'Verkaufspreis des Produkts', pt: 'Preço de venda do produto' },
        cost:        { en: 'Product Cost', es: 'Coste de Producto', ca: 'Cost de Producte', fr: 'Coût du produit', pl: 'Koszt produktu', de: 'Produktkosten', pt: 'Custo do produto' },
        tax_codes:   { en: 'Product Taxes', es: 'Impuestos de Producto', ca: 'Impostos de Producte', fr: 'Taxes du produit', pl: 'Podatki produktu', de: 'Produktsteuern', pt: 'Impostos do produto' },
        type:        { en: 'Product Type', es: 'Tipo de Producto', ca: 'Tipus de Producte', fr: 'Type de produit', pl: 'Typ produktu', de: 'Produkttyp', pt: 'Tipo de produto' },
        sku:         PRODUCT_SKU_LABEL,
        category_id: { en: 'Product Category ID', es: 'ID Categoría de Producto', ca: 'ID Categoria de Producte', fr: 'ID catégorie du produit', pl: 'ID kategorii produktu', de: 'Produktkategorie-ID', pt: 'ID categoria do produto' },
        stock:       { en: 'Product Stock', es: 'Stock de Producto', ca: 'Estoc de Producte', fr: 'Stock du produit', pl: 'Stan magazynowy produktu', de: 'Produktbestand', pt: 'Stock do produto' },
    },
    ledger: {
        id:              { en: 'Ledger Line ID', es: 'ID Línea de Asiento', ca: 'ID Línia d\'Assentament', fr: 'ID ligne d\'écriture', pl: 'ID linii zapisu', de: 'Buchungszeilen-ID', pt: 'ID linha de lançamento' },
        entry_number:    { en: 'Entry Number', es: 'Número de Asiento', ca: 'Número d\'Assentament', fr: 'Numéro d\'écriture', pl: 'Numer zapisu', de: 'Buchungsnummer', pt: 'Número de lançamento' },
        line:            { en: 'Entry Line', es: 'Línea de Asiento', ca: 'Línia d\'Assentament', fr: 'Ligne d\'écriture', pl: 'Linia zapisu', de: 'Buchungszeile', pt: 'Linha de lançamento' },
        date:            { en: 'Entry Date', es: 'Fecha de Asiento', ca: 'Data d\'Assentament', fr: 'Date d\'écriture', pl: 'Data zapisu', de: 'Buchungsdatum', pt: 'Data de lançamento' },
        type:            { en: 'Entry Type', es: 'Tipo de Asiento', ca: 'Tipus d\'Assentament', fr: 'Type d\'écriture', pl: 'Typ zapisu', de: 'Buchungsart', pt: 'Tipo de lançamento' },
        account:         { en: 'Account Code', es: 'Código de Cuenta', ca: 'Codi de Compte', fr: 'Code du compte', pl: 'Kod konta', de: 'Kontonummer', pt: 'Código da conta' },
        account_name:    { en: 'Account Name', es: 'Nombre de Cuenta', ca: 'Nom de Compte', fr: 'Nom du compte', pl: 'Nazwa konta', de: 'Kontoname', pt: 'Nome da conta' },
        description:     { en: 'Entry Description', es: 'Descripción de Asiento', ca: 'Descripció d\'Assentament', fr: 'Description de l\'écriture', pl: 'Opis zapisu', de: 'Buchungstext', pt: 'Descrição do lançamento' },
        doc_description: { en: 'Source Document', es: 'Documento de Origen', ca: 'Document d\'Origen', fr: 'Document source', pl: 'Dokument źródłowy', de: 'Ursprungsbeleg', pt: 'Documento de origem' },
        debit:           { en: 'Entry Debit', es: 'Debe de Asiento', ca: 'Deure d\'Assentament', fr: 'Débit de l\'écriture', pl: 'Winien zapisu', de: 'Soll der Buchung', pt: 'Débito do lançamento' },
        credit:          { en: 'Entry Credit', es: 'Haber de Asiento', ca: 'Haver d\'Assentament', fr: 'Crédit de l\'écriture', pl: 'Ma zapisu', de: 'Haben der Buchung', pt: 'Crédito do lançamento' },
    },
};

// Descriptions shared by several tables
const INVOICE_ID_DESC: LocalizedText = { en: 'Invoice foreign key → invoices.id', es: 'Clave foránea de factura → invoices.id', ca: 'Clau forana de factura → invoices.id', fr: 'Clé étrangère de la facture → invoices.id', pl: 'Klucz obcy faktury → invoices.id', de: 'Fremdschlüssel der Rechnung → invoices.id', pt: 'Chave estrangeira da fatura → invoices.id' };
const CONTACT_ID_DESC: LocalizedText = { en: 'Contact foreign key → contacts.id', es: 'Clave foránea de contacto → contacts.id', ca: 'Clau forana de contacte → contacts.id', fr: 'Clé étrangère du contact → contacts.id', pl: 'Klucz obcy kontaktu → contacts.id', de: 'Fremdschlüssel des Kontakts → contacts.id', pt: 'Chave estrangeira do contacto → contacts.id' };
const PRODUCT_ID_DESC: LocalizedText = { en: 'Product foreign key → products.id', es: 'Clave foránea de producto → products.id', ca: 'Clau forana de producte → products.id', fr: 'Clé étrangère du produit → products.id', pl: 'Klucz obcy produktu → products.id', de: 'Fremdschlüssel des Produkts → products.id', pt: 'Chave estrangeira do produto → products.id' };

const COLUMN_DESCRIPTIONS: Record<string, Record<string, LocalizedText>> = {
    invoices: {
        id:          { en: 'Holded internal invoice identifier', es: 'Identificador interno de la factura en Holded', ca: 'Identificador intern de la factura a Holded', fr: 'Identifiant interne de la facture dans Holded', pl: 'Wewnętrzny identyfikator faktury w Holded', de: 'Interne Rechnungs-ID in Holded', pt: 'Identificador interno da fatura no Holded' },
        number:      { en: 'Invoice document number', es: 'Número del documento de factura', ca: 'Número del document de factura', fr: 'Numéro du document de facture', pl: 'Numer dokumentu faktury', de: 'Belegnummer der Rechnung', pt: 'Número do documento da fatura' },
        date:        { en: 'Invoice issue date', es: 'Fecha de emisión de la factura', ca: 'Data d\'emissió de la factura', fr: 'Date d\'émission de la facture', pl: 'Data wystawienia faktury', de: 'Ausstellungsdatum der Rechnung', pt: 'Data de emissão da fatura' },
        due_date:    { en: 'Invoice payment due date', es: 'Fecha límite de pago de la factura', ca: 'Data límit de pagament de la factura', fr: 'Date limite de paiement de la facture', pl: 'Termin płatności faktury', de: 'Zahlungsfrist der Rechnung', pt: 'Data limite de pagamento da fatura' },
        contact_id:  CONTACT_ID_DESC,
        contact:     { en: 'Name of the invoiced contact (customer or supplier)', es: 'Nombre del contacto facturado (cliente o proveedor)', ca: 'Nom del contacte facturat (client o proveïdor)', fr: 'Nom du contact facturé (client ou fournisseur)', pl: 'Nazwa zafakturowanego kontaktu (klient lub dostawca)', de: 'Name des fakturierten Kontakts (Kunde oder Lieferant)', pt: 'Nome do contacto faturado (cliente ou fornecedor)' },
        description: { en: 'Free-text description of the invoice', es: 'Descripción en texto libre de la factura', ca: 'Descripció en text lliure de la factura', fr: 'Description en texte libre de la facture', pl: 'Opis faktury w formie dowolnego tekstu', de: 'Freitextbeschreibung der Rechnung', pt: 'Descrição em texto livre da fatura' },
        currency:    { en: 'Invoice currency code', es: 'Código de la divisa de la factura', ca: 'Codi de la divisa de la factura', fr: 'Code de la devise de la facture', pl: 'Kod waluty faktury', de: 'Währungscode der Rechnung', pt: 'Código da moeda da fatura' },
        subtotal:    { en: 'Invoice amount before taxes and discounts', es: 'Importe de la factura antes de impuestos y descuentos', ca: 'Import de la factura abans d\'impostos i descomptes', fr: 'Montant de la facture avant taxes et remises', pl: 'Kwota faktury przed podatkami i rabatami', de: 'Rechnungsbetrag vor Steuern und Rabatten', pt: 'Montante da fatura antes de impostos e descontos' },
        discount:    { en: 'Invoice discount amount or percentage', es: 'Importe o porcentaje de descuento de la factura', ca: 'Import o percentatge de descompte de la factura', fr: 'Montant ou pourcentage de remise de la facture', pl: 'Kwota lub procent rabatu faktury', de: 'Rabattbetrag oder -prozentsatz der Rechnung', pt: 'Montante ou percentagem de desconto da fatura' },
        taxes:       { en: 'Total taxes amount of the invoice', es: 'Importe total de impuestos de la factura', ca: 'Import total d\'impostos de la factura', fr: 'Montant total des taxes de la facture', pl: 'Łączna kwota podatków faktury', de: 'Gesamtbetrag der Steuern der Rechnung', pt: 'Montante total de impostos da fatura' },
        total:       { en: 'Invoice total amount including taxes', es: 'Importe total de la factura con impuestos', ca: 'Import total de la factura amb impostos', fr: 'Montant total TTC de la facture', pl: 'Łączna kwota faktury z podatkami', de: 'Gesamtbetrag der Rechnung inklusive Steuern', pt: 'Montante total da fatura com impostos' },
        status:      { en: 'Invoice payment status (pending, partial, completed, cancelled)', es: 'Estado de cobro de la factura (pending, partial, completed, cancelled)', ca: 'Estat de cobrament de la factura (pending, partial, completed, cancelled)', fr: 'Statut de paiement de la facture (pending, partial, completed, cancelled)', pl: 'Status płatności faktury (pending, partial, completed, cancelled)', de: 'Zahlungsstatus der Rechnung (pending, partial, completed, cancelled)', pt: 'Estado de cobrança da fatura (pending, partial, completed, cancelled)' },
        paid:        { en: 'Invoice amount already paid', es: 'Importe de la factura ya pagado', ca: 'Import de la factura ja pagat', fr: 'Montant de la facture déjà payé', pl: 'Kwota faktury już zapłacona', de: 'Bereits bezahlter Rechnungsbetrag', pt: 'Montante da fatura já pago' },
        pending:     { en: 'Invoice amount still pending payment', es: 'Importe de la factura pendiente de pago', ca: 'Import de la factura pendent de pagament', fr: 'Montant de la facture restant à payer', pl: 'Kwota faktury pozostała do zapłaty', de: 'Noch offener Rechnungsbetrag', pt: 'Montante da fatura pendente de pagamento' },
    },
    invoice_lines: {
        id:            { en: 'Invoice line identifier', es: 'Identificador de la línea de factura', ca: 'Identificador de la línia de factura', fr: 'Identifiant de la ligne de facture', pl: 'Identyfikator pozycji faktury', de: 'ID der Rechnungsposition', pt: 'Identificador da linha de fatura' },
        invoice_id:    INVOICE_ID_DESC,
        product_id:    PRODUCT_ID_DESC,
        name:          { en: 'Name of the product or concept invoiced in the line', es: 'Nombre del producto o concepto facturado en la línea', ca: 'Nom del producte o concepte facturat a la línia', fr: 'Nom du produit ou du concept facturé dans la ligne', pl: 'Nazwa produktu lub pozycji zafakturowanej w linii', de: 'Name des in der Position fakturierten Produkts oder Postens', pt: 'Nome do produto ou conceito faturado na linha' },
        description:   { en: 'Free-text description of the invoice line', es: 'Descripción en texto libre de la línea de factura', ca: 'Descripció en text lliure de la línia de factura', fr: 'Description en texte libre de la ligne de facture', pl: 'Opis pozycji faktury w formie dowolnego tekstu', de: 'Freitextbeschreibung der Rechnungsposition', pt: 'Descrição em texto livre da linha de fatura' },
        sku:           { en: 'Stock keeping unit code of the invoiced product', es: 'Código de referencia de stock del producto facturado', ca: 'Codi de referència d\'estoc del producte facturat', fr: 'Code de référence de stock du produit facturé', pl: 'Kod jednostki magazynowej zafakturowanego produktu', de: 'Lagerartikelnummer des fakturierten Produkts', pt: 'Código de referência de stock do produto faturado' },
        quantity:      { en: 'Quantity of units invoiced in the line', es: 'Cantidad de unidades facturadas en la línea', ca: 'Quantitat d\'unitats facturades a la línia', fr: 'Quantité d\'unités facturées dans la ligne', pl: 'Liczba jednostek zafakturowanych w pozycji', de: 'Anzahl der in der Position fakturierten Einheiten', pt: 'Quantidade de unidades faturadas na linha' },
        unit_price:    { en: 'Line price per unit before discounts', es: 'Precio por unidad de la línea antes de descuentos', ca: 'Preu per unitat de la línia abans de descomptes', fr: 'Prix unitaire de la ligne avant remises', pl: 'Cena jednostkowa pozycji przed rabatami', de: 'Stückpreis der Position vor Rabatten', pt: 'Preço por unidade da linha antes de descontos' },
        discount:      { en: 'Discount percentage applied to the line', es: 'Porcentaje de descuento aplicado a la línea', ca: 'Percentatge de descompte aplicat a la línia', fr: 'Pourcentage de remise appliqué à la ligne', pl: 'Procent rabatu zastosowany do pozycji', de: 'Auf die Position angewandter Rabattsatz', pt: 'Percentagem de desconto aplicada à linha' },
        subtotal:      { en: 'Line amount after discount and before taxes', es: 'Importe de la línea tras descuento y antes de impuestos', ca: 'Import de la línia després del descompte i abans d\'impostos', fr: 'Montant de la ligne après remise et avant taxes', pl: 'Kwota pozycji po rabacie i przed podatkami', de: 'Positionsbetrag nach Rabatt und vor Steuern', pt: 'Montante da linha após desconto e antes de impostos' },
        total:         { en: 'Line total amount including taxes and retention', es: 'Importe total de la línea con impuestos y retención', ca: 'Import total de la línia amb impostos i retenció', fr: 'Montant total de la ligne avec taxes et retenue', pl: 'Łączna kwota pozycji z podatkami i potrąceniem', de: 'Gesamtbetrag der Position inklusive Steuern und Einbehalt', pt: 'Montante total da linha com impostos e retenção' },
        tax_pct:       { en: 'Tax percentage applied to the line', es: 'Porcentaje de impuesto aplicado a la línea', ca: 'Percentatge d\'impost aplicat a la línia', fr: 'Pourcentage de taxe appliqué à la ligne', pl: 'Stawka podatku zastosowana do pozycji', de: 'Auf die Position angewandter Steuersatz', pt: 'Percentagem de imposto aplicada à linha' },
        account:       { en: 'Accounting account code of the line', es: 'Código de cuenta contable de la línea', ca: 'Codi de compte comptable de la línia', fr: 'Code du compte comptable de la ligne', pl: 'Kod konta księgowego pozycji', de: 'Code des Buchungskontos der Position', pt: 'Código da conta contabilística da linha' },
        retention_pct: { en: 'Withholding tax percentage of the line (IRPF)', es: 'Porcentaje de retención de la línea (IRPF)', ca: 'Percentatge de retenció de la línia (IRPF)', fr: 'Pourcentage de retenue à la source de la ligne (IRPF)', pl: 'Stawka podatku u źródła pozycji (IRPF)', de: 'Quellensteuersatz der Position (IRPF)', pt: 'Percentagem de retenção da linha (IRPF)' },
        retention:     { en: 'Withholding tax amount of the line (IRPF)', es: 'Importe de la retención de la línea (IRPF)', ca: 'Import de la retenció de la línia (IRPF)', fr: 'Montant de la retenue à la source de la ligne (IRPF)', pl: 'Kwota podatku u źródła pozycji (IRPF)', de: 'Quellensteuerbetrag der Position (IRPF)', pt: 'Montante da retenção da linha (IRPF)' },
    },
    contacts: {
        id:         { en: 'Holded internal contact identifier', es: 'Identificador interno del contacto en Holded', ca: 'Identificador intern del contacte a Holded', fr: 'Identifiant interne du contact dans Holded', pl: 'Wewnętrzny identyfikator kontaktu w Holded', de: 'Interne Kontakt-ID in Holded', pt: 'Identificador interno do contacto no Holded' },
        code:       { en: 'Short identification code of the contact', es: 'Código de identificación corto del contacto', ca: 'Codi d\'identificació curt del contacte', fr: 'Code d\'identification court du contact', pl: 'Krótki kod identyfikacyjny kontaktu', de: 'Kurzer Identifikationscode des Kontakts', pt: 'Código de identificação curto do contacto' },
        name:       { en: 'Name of the contact (customer or supplier)', es: 'Nombre del contacto (cliente o proveedor)', ca: 'Nom del contacte (client o proveïdor)', fr: 'Nom du contact (client ou fournisseur)', pl: 'Nazwa kontaktu (klient lub dostawca)', de: 'Name des Kontakts (Kunde oder Lieferant)', pt: 'Nome do contacto (cliente ou fornecedor)' },
        trade_name: { en: 'Commercial or trade name of the contact', es: 'Nombre comercial del contacto', ca: 'Nom comercial del contacte', fr: 'Nom commercial du contact', pl: 'Nazwa handlowa kontaktu', de: 'Handelsname des Kontakts', pt: 'Nome comercial do contacto' },
        email:      { en: 'Email address of the contact', es: 'Dirección de correo electrónico del contacto', ca: 'Adreça de correu electrònic del contacte', fr: 'Adresse e-mail du contact', pl: 'Adres e-mail kontaktu', de: 'E-Mail-Adresse des Kontakts', pt: 'Endereço de email do contacto' },
        phone:      { en: 'Phone number of the contact', es: 'Número de teléfono del contacto', ca: 'Número de telèfon del contacte', fr: 'Numéro de téléphone du contact', pl: 'Numer telefonu kontaktu', de: 'Telefonnummer des Kontakts', pt: 'Número de telefone do contacto' },
        mobile:     { en: 'Mobile phone number of the contact', es: 'Número de móvil del contacto', ca: 'Número de mòbil del contacte', fr: 'Numéro de mobile du contact', pl: 'Numer telefonu komórkowego kontaktu', de: 'Mobilnummer des Kontakts', pt: 'Número de telemóvel do contacto' },
        type:       { en: 'Contact type (client, supplier, lead...)', es: 'Tipo de contacto (client, supplier, lead...)', ca: 'Tipus de contacte (client, supplier, lead...)', fr: 'Type de contact (client, supplier, lead...)', pl: 'Typ kontaktu (client, supplier, lead...)', de: 'Kontakttyp (client, supplier, lead...)', pt: 'Tipo de contacto (client, supplier, lead...)' },
        vat:        { en: 'VAT / tax identification number of the contact', es: 'NIF / número de identificación fiscal del contacto', ca: 'NIF / número d\'identificació fiscal del contacte', fr: 'Numéro de TVA / d\'identification fiscale du contact', pl: 'NIP / numer identyfikacji podatkowej kontaktu', de: 'USt-IdNr. / Steuernummer des Kontakts', pt: 'NIF / número de identificação fiscal do contacto' },
        country:    { en: 'Billing country of the contact', es: 'País de facturación del contacto', ca: 'País de facturació del contacte', fr: 'Pays de facturation du contact', pl: 'Kraj rozliczeniowy kontaktu', de: 'Rechnungsland des Kontakts', pt: 'País de faturação do contacto' },
    },
    products: {
        id:          { en: 'Holded internal product identifier', es: 'Identificador interno del producto en Holded', ca: 'Identificador intern del producte a Holded', fr: 'Identifiant interne du produit dans Holded', pl: 'Wewnętrzny identyfikator produktu w Holded', de: 'Interne Produkt-ID in Holded', pt: 'Identificador interno do produto no Holded' },
        name:        { en: 'Name of the product in the catalogue', es: 'Nombre del producto en el catálogo', ca: 'Nom del producte al catàleg', fr: 'Nom du produit dans le catalogue', pl: 'Nazwa produktu w katalogu', de: 'Name des Produkts im Katalog', pt: 'Nome do produto no catálogo' },
        description: { en: 'Free-text description of the product', es: 'Descripción en texto libre del producto', ca: 'Descripció en text lliure del producte', fr: 'Description en texte libre du produit', pl: 'Opis produktu w formie dowolnego tekstu', de: 'Freitextbeschreibung des Produkts', pt: 'Descrição em texto livre do produto' },
        price:       { en: 'Product sale price', es: 'Precio de venta del producto', ca: 'Preu de venda del producte', fr: 'Prix de vente du produit', pl: 'Cena sprzedaży produktu', de: 'Verkaufspreis des Produkts', pt: 'Preço de venda do produto' },
        cost:        { en: 'Product cost price', es: 'Precio de coste del producto', ca: 'Preu de cost del producte', fr: 'Prix de revient du produit', pl: 'Cena kosztu produktu', de: 'Einstandspreis des Produkts', pt: 'Preço de custo do produto' },
        tax_codes:   { en: 'Taxes applied to the product', es: 'Impuestos aplicados al producto', ca: 'Impostos aplicats al producte', fr: 'Taxes appliquées au produit', pl: 'Podatki zastosowane do produktu', de: 'Auf das Produkt angewandte Steuern', pt: 'Impostos aplicados ao produto' },
        type:        { en: 'Product kind (simple, variants, pack...)', es: 'Clase de producto (simple, variants, pack...)', ca: 'Classe de producte (simple, variants, pack...)', fr: 'Nature du produit (simple, variants, pack...)', pl: 'Rodzaj produktu (simple, variants, pack...)', de: 'Produktart (simple, variants, pack...)', pt: 'Classe de produto (simple, variants, pack...)' },
        sku:         { en: 'Stock keeping unit code of the product', es: 'Código de referencia de stock del producto', ca: 'Codi de referència d\'estoc del producte', fr: 'Code de référence de stock du produit', pl: 'Kod jednostki magazynowej produktu', de: 'Lagerartikelnummer des Produkts', pt: 'Código de referência de stock do produto' },
        category_id: { en: 'Product category foreign key', es: 'Clave foránea de la categoría del producto', ca: 'Clau forana de la categoria del producte', fr: 'Clé étrangère de la catégorie du produit', pl: 'Klucz obcy kategorii produktu', de: 'Fremdschlüssel der Produktkategorie', pt: 'Chave estrangeira da categoria do produto' },
        stock:       { en: 'Units of the product in stock', es: 'Unidades del producto en stock', ca: 'Unitats del producte en estoc', fr: 'Unités du produit en stock', pl: 'Jednostki produktu w magazynie', de: 'Einheiten des Produkts auf Lager', pt: 'Unidades do produto em stock' },
    },
    ledger: {
        id:              { en: 'Holded internal ledger line identifier', es: 'Identificador interno de la línea de asiento en Holded', ca: 'Identificador intern de la línia d\'assentament a Holded', fr: 'Identifiant interne de la ligne d\'écriture dans Holded', pl: 'Wewnętrzny identyfikator linii zapisu w Holded', de: 'Interne Buchungszeilen-ID in Holded', pt: 'Identificador interno da linha de lançamento no Holded' },
        entry_number:    { en: 'Accounting entry number', es: 'Número del asiento contable', ca: 'Número de l\'assentament comptable', fr: 'Numéro de l\'écriture comptable', pl: 'Numer zapisu księgowego', de: 'Nummer der Buchung', pt: 'Número do lançamento contabilístico' },
        line:            { en: 'Line number within the entry', es: 'Número de línea dentro del asiento', ca: 'Número de línia dins de l\'assentament', fr: 'Numéro de ligne dans l\'écriture', pl: 'Numer linii w zapisie', de: 'Zeilennummer innerhalb der Buchung', pt: 'Número da linha dentro do lançamento' },
        date:            { en: 'Accounting entry date', es: 'Fecha del asiento contable', ca: 'Data de l\'assentament comptable', fr: 'Date de l\'écriture comptable', pl: 'Data zapisu księgowego', de: 'Datum der Buchung', pt: 'Data do lançamento contabilístico' },
        type:            { en: 'Accounting entry type', es: 'Tipo de asiento contable', ca: 'Tipus d\'assentament comptable', fr: 'Type d\'écriture comptable', pl: 'Typ zapisu księgowego', de: 'Art der Buchung', pt: 'Tipo de lançamento contabilístico' },
        account:         { en: 'Accounting account code', es: 'Código de cuenta contable', ca: 'Codi de compte comptable', fr: 'Code du compte comptable', pl: 'Kod konta księgowego', de: 'Code des Buchungskontos', pt: 'Código da conta contabilística' },
        account_name:    { en: 'Accounting account name', es: 'Nombre de cuenta contable', ca: 'Nom de compte comptable', fr: 'Nom du compte comptable', pl: 'Nazwa konta księgowego', de: 'Name des Buchungskontos', pt: 'Nome da conta contabilística' },
        description:     { en: 'Free-text description of the entry line', es: 'Descripción en texto libre de la línea de asiento', ca: 'Descripció en text lliure de la línia d\'assentament', fr: 'Description en texte libre de la ligne d\'écriture', pl: 'Opis linii zapisu w formie dowolnego tekstu', de: 'Freitextbeschreibung der Buchungszeile', pt: 'Descrição em texto livre da linha de lançamento' },
        doc_description: { en: 'Description of the source document', es: 'Descripción del documento de origen', ca: 'Descripció del document d\'origen', fr: 'Description du document source', pl: 'Opis dokumentu źródłowego', de: 'Beschreibung des Ursprungsbelegs', pt: 'Descrição do documento de origem' },
        debit:           { en: 'Debit amount of the entry line', es: 'Importe al debe de la línea de asiento', ca: 'Import al deure de la línia d\'assentament', fr: 'Montant au débit de la ligne d\'écriture', pl: 'Kwota po stronie Winien linii zapisu', de: 'Sollbetrag der Buchungszeile', pt: 'Montante a débito da linha de lançamento' },
        credit:          { en: 'Credit amount of the entry line', es: 'Importe al haber de la línea de asiento', ca: 'Import a l\'haver de la línia d\'assentament', fr: 'Montant au crédit de la ligne d\'écriture', pl: 'Kwota po stronie Ma linii zapisu', de: 'Habenbetrag der Buchungszeile', pt: 'Montante a crédito da linha de lançamento' },
    },
};

const SUPPORTED_LOCALES: HoldedLocale[] = ['en', 'es', 'ca', 'fr', 'pl', 'de', 'pt'];

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
            const cLabels  = COLUMN_LABELS[tKey]?.[cKey];
            const cDescs   = COLUMN_DESCRIPTIONS[tKey]?.[cKey];
            const cDefault = cLabels?.[locale] ?? col.display_name?.default ?? cKey;
            const cDesc    = cDescs?.[locale] ?? cDefault;

            col.display_name = {
                default: cDefault,
                localized: SUPPORTED_LOCALES
                    .filter(l => l !== locale && cLabels?.[l])
                    .map(l => ({ locale: l, value: cLabels[l] }))
            };
            col.description = {
                default: cDesc,
                localized: SUPPORTED_LOCALES
                    .filter(l => l !== locale && cDescs?.[l])
                    .map(l => ({ locale: l, value: cDescs[l] }))
            };
        }
    }
}
