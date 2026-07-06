# Jednokratna priprema D-PDV templatea (treba je ponoviti samo ako UINO
# promijeni obrazac): u pravi Excel upiše placeholder vrijednosti fiksnih
# dužina koje aplikacija kasnije mijenja na nivou bajtova, pa izgled obrasca
# (ivice, visine redova, formule) ostaje 100% originalan.
#
# Upotreba:  .\dpdv-prep-template.ps1 <original-uino.xls> <izlazni-template.xls>
# Nakon toga: node scripts/dpdv-find-offsets.js <izlazni-template.xls>
# i dobijene tabele zalijepiti u src/sections/pdv/dpdvExcel.ts.
param(
    [Parameter(Mandatory = $true)][string]$Src,
    [Parameter(Mandatory = $true)][string]$Dst
)
$ErrorActionPreference = "Stop"
$Src = (Resolve-Path $Src).Path
if (Test-Path $Dst) { Remove-Item $Dst -Force -Confirm:$false }
$DstFull = Join-Path (Resolve-Path (Split-Path $Dst -Parent)).Path (Split-Path $Dst -Leaf)

function PH([string]$tag, [int]$len) {
    # placeholder: Ć (forsira UTF-16 zapis u SST) + tag + ~ do fiksne dužine
    $s = [string]([char]0x0106) + $tag
    return $s.PadRight($len, [char]'~')
}

$magicBase = 987654301.234567

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
    $wb = $xl.Workbooks.Open($Src)
    $ws1 = $wb.Worksheets.Item("Obrazac DPDV")
    $ws2 = $wb.Worksheets.Item("Polja iz obrasca")

    # ── stringovi na obrascu (dužine se moraju poklapati sa dpdvExcel.ts) ──
    $ws1.Range("B4").Value2 = PH "NAZIV" 80
    $ws1.Range("B6").Value2 = PH "ADRESA" 60
    $ws1.Range("B8").Value2 = PH "TELEFON" 30
    $ws1.Range("B9").Value2 = PH "DJELATNOST" 60
    $ws1.Range("K9").Value2 = PH "PRETEZNA" 40
    $ws1.Range("B41").Value2 = PH "MJESTO" 30
    $ws1.Range("E41").Value2 = PH "DATUM" 11
    $ws1.Range("K41").Value2 = PH "ODGOVORNO" 40

    # ── magic brojevi: ID kućice red 5 (F..Q), datumi redovi 7 i 8 (J..Q),
    # pa iznosi stavki; redoslijed identičan NUM_SLOTS u dpdvExcel.ts ──────
    $magicCells = @()
    foreach ($c in 6..17) { $magicCells += ,@(5, $c) }
    foreach ($c in 10..17) { $magicCells += ,@(7, $c) }
    foreach ($c in 10..17) { $magicCells += ,@(8, $c) }
    $magicCells += @(@(13,6),@(14,6),@(15,6),@(16,6),@(17,6),@(18,6),@(18,12),@(19,12),@(20,6),@(20,12),@(21,6),@(21,12),@(22,12),@(26,6),@(27,6),@(27,12),@(28,6),@(28,12),@(29,6),@(29,12),@(30,6),@(30,12),@(31,6),@(31,12),@(32,12),@(33,6),@(33,12),@(34,12),@(38,6))
    $inv = [System.Globalization.CultureInfo]::InvariantCulture
    $i = 0
    foreach ($a in $magicCells) {
        # preko .Formula (string) jer Value2 na nekim ćelijama baca COM cast grešku
        $s = ([double]($magicBase + $i)).ToString("R", $inv)
        $cell = $ws1.Cells.Item([int]$a[0], [int]$a[1])
        $cell.Formula = $s
        # iznosi (slotovi 28+) se prikazuju kao 1.234,56; NumberFormat setter
        # tumači string kroz locale sistema pa se format zadaje lokalno
        # (bs/hr: tačka hiljade, zarez decimale) i kanonski se sačuva #,##0.00
        if ($i -ge 28) { $cell.NumberFormatLocal = "#.##0,00" }
        $i++
    }
    Write-Output "magic slots: $i"

    # ── mašinski sheet: concat formule (ID broj, period) mijenjamo statičkim
    # placeholder-ima jer bi im keš sadržavao magic brojeve kao tekst ──────
    $ws2.Range("B1").Value2 = PH "IDB" 12
    $ws2.Range("E1").Value2 = PH "PER" 4
    $ws2.Range("F1").Value2 = PH "DATDO" 8

    $xl.CalculateFull()

    # normalni pogled na oba sheeta (inače se preko obrasca vidi "Page 1"
    # vodeni žig iz Page Break Preview-a) i fajl se otvara na obrascu
    $ws2.Activate(); $wb.Windows.Item(1).View = 1
    $ws1.Activate(); $wb.Windows.Item(1).View = 1
    $ws1.Range("A1").Select()

    $wb.SaveAs($DstFull, 56)   # 56 = xlExcel8 (BIFF8 .xls)
    $wb.Close($false)
    Write-Output "saved: $DstFull"
} finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
}
