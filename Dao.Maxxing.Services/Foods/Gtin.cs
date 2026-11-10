namespace Dao.Maxxing.Services.Foods;

/// <summary>
/// Barcodes in canonical form: GTIN-14, zero-padded. UPC-A (12 digits), EAN-13, and EAN-8 for the same
/// product all normalize to the same value, so a scan matches a stored food however it was recorded.
/// </summary>
internal static class Gtin
{
    /// <summary>The GTIN-14 for a barcode, or null if it isn't a valid GTIN (wrong length or check digit).</summary>
    public static string? Normalize(string? barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode)) return null;
        var digits = new string(barcode.Where(c => !char.IsWhiteSpace(c) && c != '-').ToArray());
        if (digits.Length is not (8 or 12 or 13 or 14) || !digits.All(char.IsAsciiDigit)) return null;

        var gtin = digits.PadLeft(14, '0');
        return HasValidCheckDigit(gtin) ? gtin : null;
    }

    private static bool HasValidCheckDigit(string gtin14)
    {
        // From the right, excluding the check digit, digits alternate weights 3 and 1.
        var sum = 0;
        for (var i = 0; i < 13; i++)
        {
            var digit = gtin14[i] - '0';
            sum += i % 2 == 0 ? digit * 3 : digit;
        }
        return (10 - sum % 10) % 10 == gtin14[13] - '0';
    }
}
