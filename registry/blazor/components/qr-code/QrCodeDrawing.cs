// Drawing ported from SheenUI React qr-code-drawing.tsx; independent of the encoder.
using System;
using System.Globalization;
using System.Security;
using System.Text;
namespace SheenUI.Internal.QrCode;

internal static class QrCodeDrawing
{
    private static string N(double v) { var n = Math.Round(v, 3, MidpointRounding.AwayFromZero); return n == 0 ? "0" : n.ToString("0.###", CultureInfo.InvariantCulture); }
    private static string Rect(double x, double y, double w, double h, double radius)
    {
        var a = Math.Min(radius, Math.Min(w / 2, h / 2));
        return $"M{N(x + a)} {N(y)}h{N(w - 2 * a)}a{N(a)} {N(a)} 0 0 1 {N(a)} {N(a)}v{N(h - 2 * a)}a{N(a)} {N(a)} 0 0 1 {N(-a)} {N(a)}h{N(-(w - 2 * a))}a{N(a)} {N(a)} 0 0 1 {N(-a)} {N(-a)}v{N(-(h - 2 * a))}a{N(a)} {N(a)} 0 0 1 {N(a)} {N(-a)}z";
    }
    internal static string Path(QrCodeEncoder qr, int margin, string shape, int hole)
    {
        var d = new StringBuilder(); var count = qr.size; double start = (count - hole) / 2.0;
        bool Dark(int row, int col) => qr.getModule(col, row) && !(hole > 0 && row >= start && row < start + hole && col >= start && col < start + hole);
        bool Eye(int row, int col) => (row < 7 && col < 7) || (row < 7 && col >= count - 7) || (row >= count - 7 && col < 7);
        if (shape == "square")
        {
            for (int row = 0; row < count; row++) for (int col = 0; col < count; col++)
            {
                if (!Dark(row, col)) continue; int end = col; while (end + 1 < count && Dark(row, end + 1)) end++;
                int width = end - col + 1; d.Append(FormattableString.Invariant($"M{col + margin} {row + margin}h{width}v1h{-width}z")); col = end;
            }
        }
        else
        {
            for (int row = 0; row < count; row++) for (int col = 0; col < count; col++)
            {
                if (!Dark(row, col) || Eye(row, col)) continue;
                d.Append(shape == "dots" ? Rect(col + margin + .1, row + margin + .1, .8, .8, .4) : Rect(col + margin, row + margin, 1, 1, .3));
            }
            foreach (var (row, col) in new[] { (0, 0), (0, count - 7), (count - 7, 0) }) { double x = col + margin, y = row + margin; d.Append(Rect(x, y, 7, 7, 2.2)).Append(Rect(x + 1, y + 1, 5, 5, 1.5)).Append(Rect(x + 2, y + 2, 3, 3, 1)); }
        }
        return d.ToString();
    }
    internal static string Svg(QrCodeEncoder qr, int size, int margin, string shape, int hole, string foreground, string background, string label)
    {
        int total = qr.size + margin * 2;
        return FormattableString.Invariant($"<svg xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"{SecurityElement.Escape(label)}\" width=\"{size}\" height=\"{size}\" viewBox=\"0 0 {total} {total}\"{(shape == "square" ? " shape-rendering=\"crispEdges\"" : "")}><rect width=\"{total}\" height=\"{total}\" fill=\"{SecurityElement.Escape(background)}\"/><path fill=\"{SecurityElement.Escape(foreground)}\" fill-rule=\"evenodd\" d=\"{Path(qr, margin, shape, hole)}\"/></svg>");
    }
}
