using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RaxUI.Internal.QrCode;
using ZXing;
namespace RaxUI.Integration.Tests;

public class QrEncoderTests
{
    [Fact]
    public void Port_matches_pinned_Nayuki_and_decodes_independently()
    {
        using var json = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "QrNayukiVectors.json")));
        foreach (var v in json.RootElement.GetProperty("vectors").EnumerateArray())
        {
            var text = v.GetProperty("text").GetString()!; var level = v.GetProperty("level").GetString()!;
            var ecc = level switch { "LOW" => QrCodeEncoder.Ecc.LOW, "MEDIUM" => QrCodeEncoder.Ecc.MEDIUM, "QUARTILE" => QrCodeEncoder.Ecc.QUARTILE, _ => QrCodeEncoder.Ecc.HIGH };
            var version = v.GetProperty("version").GetInt32(); bool fixedVersion = v.TryGetProperty("fixedVersion", out var f) && f.GetBoolean();
            var qr = QrCodeEncoder.encodeSegments(QrCodeSegment.makeSegments(text), ecc, fixedVersion ? version : 1, fixedVersion ? version : 40, v.GetProperty("mask").GetInt32(), v.GetProperty("boost").GetBoolean());
            var bits = new StringBuilder(); for (var y = 0; y < qr.size; y++) for (var x = 0; x < qr.size; x++) bits.Append(qr.getModule(x, y) ? '1' : '0');
            Assert.Equal(v.GetProperty("hash").GetString(), Convert.ToHexStringLower(SHA256.HashData(Encoding.ASCII.GetBytes(bits.ToString()))));
            Assert.Equal(version, qr.version); Assert.Equal(17 + 4 * version, qr.size); Assert.Equal(v.GetProperty("selectedMask").GetInt32(), qr.mask);
            foreach (var (x, y) in new[] { (0, 0), (qr.size - 7, 0), (0, qr.size - 7) }) for (int dy = 0; dy < 7; dy++) for (int dx = 0; dx < 7; dx++) Assert.Equal(dx == 0 || dy == 0 || dx == 6 || dy == 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4), qr.getModule(x + dx, y + dy));
            if (text.Length == 0) continue;
            int size = (qr.size + 8) * 4; var pixels = new byte[size * size];
            for (int y = 0; y < size; y++) for (int x = 0; x < size; x++) pixels[y * size + x] = (byte)(qr.getModule(x / 4 - 4, y / 4 - 4) ? 0 : 255);
            var decoder = new BarcodeReaderGeneric { Options = new() { CharacterSet = "UTF-8", PossibleFormats = [BarcodeFormat.QR_CODE], TryHarder = true, PureBarcode = true } };
            Assert.Equal(text, decoder.Decode(pixels, size, size, RGBLuminanceSource.BitmapFormat.Gray8)?.Text);
        }
    }
    [Fact]
    public void Drawing_matches_React_for_fixed_matrix_and_escapes_SVG_labels()
    {
        using var json = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "QrNayukiVectors.json")));
        var qr = QrCodeEncoder.encodeSegments(QrCodeSegment.makeSegments("SHEEN UI"), QrCodeEncoder.Ecc.MEDIUM, 1, 1, 0, false);
        var prior = System.Globalization.CultureInfo.CurrentCulture;
        try
        {
            System.Globalization.CultureInfo.CurrentCulture = System.Globalization.CultureInfo.GetCultureInfo("fr-FR");
            foreach (var v in json.RootElement.GetProperty("drawings").EnumerateArray())
            {
                var path = QrCodeDrawing.Path(qr, v.GetProperty("margin").GetInt32(), v.GetProperty("shape").GetString()!, v.GetProperty("hole").GetInt32());
                Assert.Equal(v.GetProperty("hash").GetString(), Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(path))));
            }
            var svg = QrCodeDrawing.Svg(qr, 200, 4, "square", 0, "black", "white", "\"/><script>alert(1)</script>");
            Assert.DoesNotContain("<script>", svg); Assert.Contains("&lt;script&gt;", svg);
        }
        finally { System.Globalization.CultureInfo.CurrentCulture = prior; }
    }
    [Fact]
    public void Oversized_and_invalid_Unicode_inputs_fail_clearly()
    {
        Assert.Throws<ArgumentException>(() => QrCodeEncoder.encodeText(new string('x', 4000), QrCodeEncoder.Ecc.LOW));
        Assert.Throws<EncoderFallbackException>(() => QrCodeSegment.makeSegments("\ud800"));
    }
}
