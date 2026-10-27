/*
 * QR Code generator library (TypeScript)
 *
 * Copyright (c) Project Nayuki. (MIT License)
 * https://www.nayuki.io/page/qr-code-generator-library
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * - The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 * - The Software is provided "as is", without warranty of any kind, express or
 *   implied, including but not limited to the warranties of merchantability,
 *   fitness for a particular purpose and noninfringement. In no event shall the
 *   authors or copyright holders be liable for any claim, damages or other
 *   liability, whether in an action of contract, tort or otherwise, arising from,
 *   out of or in connection with the Software or the use or other dealings in the
 *   Software.
 */


// C# port; pinned source and differences: docs/adr/020-third-party-source.md
using System;
using System.Collections.Generic;
using System.Linq;
using static SheenUI.Internal.QrCode.QrCodeEncoder;
namespace SheenUI.Internal.QrCode;

internal sealed class QrCodeEncoder
{









    public static QrCodeEncoder encodeText(string text, QrCodeEncoder.Ecc ecl)
    {
        List<QrCodeSegment> segs = QrCodeSegment.makeSegments(text);
        return QrCodeEncoder.encodeSegments(segs, ecl);
    }






    public static QrCodeEncoder encodeBinary(List<int> data, QrCodeEncoder.Ecc ecl)
    {
        QrCodeSegment seg = QrCodeSegment.makeBytes(data);
        return QrCodeEncoder.encodeSegments([seg], ecl);
    }













    public static QrCodeEncoder encodeSegments(List<QrCodeSegment> segs, QrCodeEncoder.Ecc ecl, int minVersion = 1, int maxVersion = 40, int mask = -1, bool boostEcl = true)
    {

        if (!(QrCodeEncoder.MIN_VERSION <= minVersion && minVersion <= maxVersion && maxVersion <= QrCodeEncoder.MAX_VERSION)
                || mask < -1 || mask > 7)
            throw new ArgumentException("Invalid value");


        int version;
        int dataUsedBits;
        for (version = minVersion; ; version++)
        {
            int candidateCapacity = QrCodeEncoder.getNumDataCodewords(version, ecl) * 8;
            int usedBits = QrCodeSegment.getTotalBits(segs, version);
            if (usedBits <= candidateCapacity)
            {
                dataUsedBits = usedBits;
                break;
            }
            if (version >= maxVersion)
                throw new ArgumentException("Data too long");
        }


        foreach (var newEcl in new[] { QrCodeEncoder.Ecc.MEDIUM, QrCodeEncoder.Ecc.QUARTILE, QrCodeEncoder.Ecc.HIGH })
        {
            if (boostEcl && dataUsedBits <= QrCodeEncoder.getNumDataCodewords(version, newEcl) * 8)
                ecl = newEcl;
        }


        List<int> bb = [];
        foreach (var seg in segs)
        {
            appendBits(seg.mode.modeBits, 4, bb);
            appendBits(seg.numChars, seg.mode.numCharCountBits(version), bb);
            foreach (var b in seg.getData())
                bb.Add(b);
        }
        assert(bb.Count == dataUsedBits);


        int dataCapacityBits = QrCodeEncoder.getNumDataCodewords(version, ecl) * 8;
        assert(bb.Count <= dataCapacityBits);
        appendBits(0, Math.Min(4, dataCapacityBits - bb.Count), bb);
        appendBits(0, (8 - bb.Count % 8) % 8, bb);
        assert(bb.Count % 8 == 0);


        for (var padByte = 0xEC; bb.Count < dataCapacityBits; padByte ^= 0xEC ^ 0x11)
            appendBits(padByte, 8, bb);


        List<int> dataCodewords = [];
        while (dataCodewords.Count * 8 < bb.Count)
            dataCodewords.Add(0);
        for (int i = 0; i < bb.Count; i++) dataCodewords[i >>> 3] |= bb[i] << (7 - (i & 7));


        return new QrCodeEncoder(version, ecl, dataCodewords, mask);
    }






    public readonly int size;




    public readonly int mask;



    private readonly List<List<bool>> modules = [];


    private readonly List<List<bool>> isFunction = [];








    public readonly int version;
    public readonly Ecc errorCorrectionLevel;
    public QrCodeEncoder(int version, Ecc errorCorrectionLevel, List<int> dataCodewords, int msk)
    {
        this.version = version; this.errorCorrectionLevel = errorCorrectionLevel;



        if (version < QrCodeEncoder.MIN_VERSION || version > QrCodeEncoder.MAX_VERSION)
            throw new ArgumentException("Version value out of range");
        if (msk < -1 || msk > 7)
            throw new ArgumentException("Mask value out of range");
        this.size = version * 4 + 17;


        List<bool> row = [];
        for (var i = 0; i < this.size; i++)
            row.Add(false);
        for (var i = 0; i < this.size; i++)
        {
            this.modules.Add(row.ToList());
            this.isFunction.Add(row.ToList());
        }


        this.drawFunctionPatterns();
        List<int> allCodewords = this.addEccAndInterleave(dataCodewords);
        this.drawCodewords(allCodewords);


        if (msk == -1)
        {
            int minPenalty = 1000000000;
            for (var i = 0; i < 8; i++)
            {
                this.applyMask(i);
                this.drawFormatBits(i);
                int penalty = this.getPenaltyScore();
                if (penalty < minPenalty)
                {
                    msk = i;
                    minPenalty = penalty;
                }
                this.applyMask(i);
            }
        }
        assert(0 <= msk && msk <= 7);
        this.mask = msk;
        this.applyMask(msk);
        this.drawFormatBits(msk);


    }







    public bool getModule(int x, int y)
    {
        return 0 <= x && x < this.size && 0 <= y && y < this.size && this.modules[y][x];
    }





    private void drawFunctionPatterns()
    {

        for (var i = 0; i < this.size; i++)
        {
            this.setFunctionModule(6, i, i % 2 == 0);
            this.setFunctionModule(i, 6, i % 2 == 0);
        }


        this.drawFinderPattern(3, 3);
        this.drawFinderPattern(this.size - 4, 3);
        this.drawFinderPattern(3, this.size - 4);


        List<int> alignPatPos = this.getAlignmentPatternPositions();
        int numAlign = alignPatPos.Count;
        for (var i = 0; i < numAlign; i++)
        {
            for (var j = 0; j < numAlign; j++)
            {

                if (!(i == 0 && j == 0 || i == 0 && j == numAlign - 1 || i == numAlign - 1 && j == 0))
                    this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
            }
        }


        this.drawFormatBits(0);
        this.drawVersion();
    }




    private void drawFormatBits(int mask)
    {

        int data = this.errorCorrectionLevel.formatBits << 3 | mask;
        int rem = data;
        for (var i = 0; i < 10; i++)
            rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
        var bits = (data << 10 | rem) ^ 0x5412;
        assert(bits >>> 15 == 0);


        for (var i = 0; i <= 5; i++)
            this.setFunctionModule(8, i, getBit(bits, i));
        this.setFunctionModule(8, 7, getBit(bits, 6));
        this.setFunctionModule(8, 8, getBit(bits, 7));
        this.setFunctionModule(7, 8, getBit(bits, 8));
        for (var i = 9; i < 15; i++)
            this.setFunctionModule(14 - i, 8, getBit(bits, i));


        for (var i = 0; i < 8; i++)
            this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
        for (var i = 8; i < 15; i++)
            this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
        this.setFunctionModule(8, this.size - 8, true);
    }




    private void drawVersion()
    {
        if (this.version < 7)
            return;


        int rem = this.version;
        for (var i = 0; i < 12; i++)
            rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
        int bits = this.version << 12 | rem;
        assert(bits >>> 18 == 0);


        for (var i = 0; i < 18; i++)
        {
            bool color = getBit(bits, i);
            int a = this.size - 11 + i % 3;
            int b = (i / 3);
            this.setFunctionModule(a, b, color);
            this.setFunctionModule(b, a, color);
        }
    }




    private void drawFinderPattern(int x, int y)
    {
        for (var dy = -4; dy <= 4; dy++)
        {
            for (var dx = -4; dx <= 4; dx++)
            {
                int dist = Math.Max(Math.Abs(dx), Math.Abs(dy));
                int xx = x + dx;
                int yy = y + dy;
                if (0 <= xx && xx < this.size && 0 <= yy && yy < this.size)
                    this.setFunctionModule(xx, yy, dist != 2 && dist != 4);
            }
        }
    }




    private void drawAlignmentPattern(int x, int y)
    {
        for (var dy = -2; dy <= 2; dy++)
        {
            for (var dx = -2; dx <= 2; dx++)
                this.setFunctionModule(x + dx, y + dy, Math.Max(Math.Abs(dx), Math.Abs(dy)) != 1);
        }
    }




    private void setFunctionModule(int x, int y, bool isDark)
    {
        this.modules[y][x] = isDark;
        this.isFunction[y][x] = true;
    }






    private List<int> addEccAndInterleave(List<int> data)
    {
        int ver = this.version;
        QrCodeEncoder.Ecc ecl = this.errorCorrectionLevel;
        if (data.Count != QrCodeEncoder.getNumDataCodewords(ver, ecl))
            throw new ArgumentException("Invalid argument");


        int numBlocks = QrCodeEncoder.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
        int blockEccLen = QrCodeEncoder.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
        int rawCodewords = (QrCodeEncoder.getNumRawDataModules(ver) / 8);
        int numShortBlocks = numBlocks - rawCodewords % numBlocks;
        int shortBlockLen = (rawCodewords / numBlocks);


        List<List<int>> blocks = [];
        List<int> rsDiv = QrCodeEncoder.reedSolomonComputeDivisor(blockEccLen);
        for (int i = 0, k = 0; i < numBlocks; i++)
        {
            List<int> dat = data.GetRange(k, shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
            k += dat.Count;
            List<int> ecc = QrCodeEncoder.reedSolomonComputeRemainder(dat, rsDiv);
            if (i < numShortBlocks)
                dat.Add(0);
            blocks.Add(dat.Concat(ecc).ToList());
        }


        List<int> result = [];
        for (var i = 0; i < blocks[0].Count; i++)
        {
            for (int j = 0; j < blocks.Count; j++)
            {
                var block = blocks[j];

                if (i != shortBlockLen - blockEccLen || j >= numShortBlocks)
                    result.Add(block[i]);
            }
        }
        assert(result.Count == rawCodewords);
        return result;
    }




    private void drawCodewords(List<int> data)
    {
        if (data.Count != (QrCodeEncoder.getNumRawDataModules(this.version) / 8))
            throw new ArgumentException("Invalid argument");
        int i = 0;

        for (var right = this.size - 1; right >= 1; right -= 2)
        {
            if (right == 6)
                right = 5;
            for (var vert = 0; vert < this.size; vert++)
            {
                for (var j = 0; j < 2; j++)
                {
                    int x = right - j;
                    bool upward = ((right + 1) & 2) == 0;
                    int y = upward ? this.size - 1 - vert : vert;
                    if (!this.isFunction[y][x] && i < data.Count * 8)
                    {
                        this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
                        i++;
                    }


                }
            }
        }
        assert(i == data.Count * 8);
    }







    private void applyMask(int mask)
    {
        if (mask < 0 || mask > 7)
            throw new ArgumentException("Mask value out of range");
        for (var y = 0; y < this.size; y++)
        {
            for (var x = 0; x < this.size; x++)
            {
                bool invert;
                switch (mask)
                {
                    case 0: invert = (x + y) % 2 == 0; break;
                    case 1: invert = y % 2 == 0; break;
                    case 2: invert = x % 3 == 0; break;
                    case 3: invert = (x + y) % 3 == 0; break;
                    case 4: invert = ((x / 3) + (y / 2)) % 2 == 0; break;
                    case 5: invert = x * y % 2 + x * y % 3 == 0; break;
                    case 6: invert = (x * y % 2 + x * y % 3) % 2 == 0; break;
                    case 7: invert = ((x + y) % 2 + x * y % 3) % 2 == 0; break;
                    default: throw new InvalidOperationException("Unreachable");
                }
                if (!this.isFunction[y][x] && invert)
                    this.modules[y][x] = !this.modules[y][x];
            }
        }
    }




    private int getPenaltyScore()
    {
        int result = 0;


        for (var y = 0; y < this.size; y++)
        {
            var runColor = false;
            var runX = 0;
            List<int> runHistory = [0, 0, 0, 0, 0, 0, 0];
            for (var x = 0; x < this.size; x++)
            {
                if (this.modules[y][x] == runColor)
                {
                    runX++;
                    if (runX == 5)
                        result += QrCodeEncoder.PENALTY_N1;
                    else if (runX > 5)
                        result++;
                }
                else
                {
                    this.finderPenaltyAddHistory(runX, runHistory);
                    if (!runColor)
                        result += this.finderPenaltyCountPatterns(runHistory) * QrCodeEncoder.PENALTY_N3;
                    runColor = this.modules[y][x];
                    runX = 1;
                }
            }
            result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * QrCodeEncoder.PENALTY_N3;
        }

        for (var x = 0; x < this.size; x++)
        {
            var runColor = false;
            var runY = 0;
            List<int> runHistory = [0, 0, 0, 0, 0, 0, 0];
            for (var y = 0; y < this.size; y++)
            {
                if (this.modules[y][x] == runColor)
                {
                    runY++;
                    if (runY == 5)
                        result += QrCodeEncoder.PENALTY_N1;
                    else if (runY > 5)
                        result++;
                }
                else
                {
                    this.finderPenaltyAddHistory(runY, runHistory);
                    if (!runColor)
                        result += this.finderPenaltyCountPatterns(runHistory) * QrCodeEncoder.PENALTY_N3;
                    runColor = this.modules[y][x];
                    runY = 1;
                }
            }
            result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * QrCodeEncoder.PENALTY_N3;
        }


        for (var y = 0; y < this.size - 1; y++)
        {
            for (var x = 0; x < this.size - 1; x++)
            {
                bool color = this.modules[y][x];
                if (color == this.modules[y][x + 1] &&
                      color == this.modules[y + 1][x] &&
                      color == this.modules[y + 1][x + 1])
                    result += QrCodeEncoder.PENALTY_N2;
            }
        }


        int dark = 0;
        foreach (var row in this.modules)
            dark += row.Count(color => color);
        int total = this.size * this.size;

        int k = (Math.Abs(dark * 20 - total * 10) + total - 1) / total - 1;
        assert(0 <= k && k <= 9);
        result += k * QrCodeEncoder.PENALTY_N4;
        assert(0 <= result && result <= 2568888);
        return result;
    }







    private List<int> getAlignmentPatternPositions()
    {
        if (this.version == 1)
            return [];
        else
        {
            int numAlign = (this.version / 7) + 2;
            int step = ((this.version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
            List<int> result = [6];
            for (var pos = this.size - 7; result.Count < numAlign; pos -= step)
                result.Insert(1, pos);
            return result;
        }
    }





    private static int getNumRawDataModules(int ver)
    {
        if (ver < QrCodeEncoder.MIN_VERSION || ver > QrCodeEncoder.MAX_VERSION)
            throw new ArgumentException("Version number out of range");
        int result = (16 * ver + 128) * ver + 64;
        if (ver >= 2)
        {
            int numAlign = (ver / 7) + 2;
            result -= (25 * numAlign - 10) * numAlign - 55;
            if (ver >= 7)
                result -= 36;
        }
        assert(208 <= result && result <= 29648);
        return result;
    }





    private static int getNumDataCodewords(int ver, QrCodeEncoder.Ecc ecl)
    {
        return (QrCodeEncoder.getNumRawDataModules(ver) / 8) -
            QrCodeEncoder.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] *
            QrCodeEncoder.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
    }




    private static List<int> reedSolomonComputeDivisor(int degree)
    {
        if (degree < 1 || degree > 255)
            throw new ArgumentException("Degree out of range");


        List<int> result = [];
        for (var i = 0; i < degree - 1; i++)
            result.Add(0);
        result.Add(1);




        var root = 1;
        for (var i = 0; i < degree; i++)
        {

            for (var j = 0; j < result.Count; j++)
            {
                result[j] = QrCodeEncoder.reedSolomonMultiply(result[j], root);
                if (j + 1 < result.Count)
                    result[j] ^= result[j + 1];
            }
            root = QrCodeEncoder.reedSolomonMultiply(root, 0x02);
        }
        return result;
    }



    private static List<int> reedSolomonComputeRemainder(List<int> data, List<int> divisor)
    {
        List<int> result = divisor.Select(_ => 0).ToList();
        foreach (var b in data)
        {
            int factor = b ^ result[0];
            result.RemoveAt(0);
            result.Add(0);
            for (int i = 0; i < divisor.Count; i++) result[i] ^= QrCodeEncoder.reedSolomonMultiply(divisor[i], factor);
        }
        return result;
    }




    private static int reedSolomonMultiply(int x, int y)
    {
        if (x >>> 8 != 0 || y >>> 8 != 0)
            throw new ArgumentException("Byte out of range");

        int z = 0;
        for (var i = 7; i >= 0; i--)
        {
            z = (z << 1) ^ ((z >>> 7) * 0x11D);
            z ^= ((y >>> i) & 1) * x;
        }
        assert(z >>> 8 == 0);
        return z;
    }




    private int finderPenaltyCountPatterns(List<int> runHistory)
    {
        int n = runHistory[1];
        assert(n <= this.size * 3);
        bool core = n > 0 && runHistory[2] == n && runHistory[3] == n * 3 && runHistory[4] == n && runHistory[5] == n;
        return (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0)
             + (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0);
    }



    private int finderPenaltyTerminateAndCount(bool currentRunColor, int currentRunLength, List<int> runHistory)
    {
        if (currentRunColor)
        {
            this.finderPenaltyAddHistory(currentRunLength, runHistory);
            currentRunLength = 0;
        }
        currentRunLength += this.size;
        this.finderPenaltyAddHistory(currentRunLength, runHistory);
        return this.finderPenaltyCountPatterns(runHistory);
    }



    private void finderPenaltyAddHistory(int currentRunLength, List<int> runHistory)
    {
        if (runHistory[0] == 0)
            currentRunLength += this.size;
        runHistory.RemoveAt(runHistory.Count - 1);
        runHistory.Insert(0, currentRunLength);
    }





    public static readonly int MIN_VERSION = 1;

    public static readonly int MAX_VERSION = 40;


    private static readonly int PENALTY_N1 = 3;
    private static readonly int PENALTY_N2 = 3;
    private static readonly int PENALTY_N3 = 40;
    private static readonly int PENALTY_N4 = 10;

    private static readonly List<List<int>> ECC_CODEWORDS_PER_BLOCK = [


        [-1,  7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
            [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
            [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
            [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
        ];

    private static readonly List<List<int>> NUM_ERROR_CORRECTION_BLOCKS = [


        [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4,  4,  4,  4,  4,  6,  6,  6,  6,  7,  8,  8,  9,  9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
            [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5,  5,  8,  9,  9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
            [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8,  8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
            [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
        ];


    internal static void appendBits(int val, int len, List<int> bb)
    {
        if (len < 0 || len > 31 || (val >>> len) != 0) throw new ArgumentException("Value out of range");
        for (int i = len - 1; i >= 0; i--) bb.Add((val >>> i) & 1);
    }
    internal static bool getBit(int x, int i) => ((x >>> i) & 1) != 0;
    private static void assert(bool value) { if (!value) throw new InvalidOperationException("Assertion error"); }
    public sealed record Ecc(int ordinal, int formatBits)
    {
        public static readonly Ecc LOW = new(0, 1), MEDIUM = new(1, 0), QUARTILE = new(2, 3), HIGH = new(3, 2);
    }

}
internal sealed class QrCodeSegment
{







    public static QrCodeSegment makeBytes(List<int> data)
    {
        List<int> bb = [];
        foreach (var b in data)
            appendBits(b, 8, bb);
        return new QrCodeSegment(QrCodeSegment.Mode.BYTE, data.Count, bb);
    }



    public static QrCodeSegment makeNumeric(string digits)
    {
        if (!QrCodeSegment.isNumeric(digits))
            throw new ArgumentException("String contains non-numeric characters");
        List<int> bb = [];
        for (var i = 0; i < digits.Length;)
        {
            int n = Math.Min(digits.Length - i, 3);
            appendBits(int.Parse(digits.Substring(i, n), System.Globalization.CultureInfo.InvariantCulture), n * 3 + 1, bb);
            i += n;
        }
        return new QrCodeSegment(QrCodeSegment.Mode.NUMERIC, digits.Length, bb);
    }





    public static QrCodeSegment makeAlphanumeric(string text)
    {
        if (!QrCodeSegment.isAlphanumeric(text))
            throw new ArgumentException("String contains unencodable characters in alphanumeric mode");
        List<int> bb = [];
        int i;
        for (i = 0; i + 2 <= text.Length; i += 2)
        {
            int temp = QrCodeSegment.ALPHANUMERIC_CHARSET.IndexOf(text[i]) * 45;
            temp += QrCodeSegment.ALPHANUMERIC_CHARSET.IndexOf(text[i + 1]);
            appendBits(temp, 11, bb);
        }
        if (i < text.Length)
            appendBits(QrCodeSegment.ALPHANUMERIC_CHARSET.IndexOf(text[i]), 6, bb);
        return new QrCodeSegment(QrCodeSegment.Mode.ALPHANUMERIC, text.Length, bb);
    }




    public static List<QrCodeSegment> makeSegments(string text)
    {

        if (text == "")
            return [];
        else if (QrCodeSegment.isNumeric(text))
            return [QrCodeSegment.makeNumeric(text)];
        else if (QrCodeSegment.isAlphanumeric(text))
            return [QrCodeSegment.makeAlphanumeric(text)];
        else
            return [QrCodeSegment.makeBytes(QrCodeSegment.toUtf8ByteArray(text))];
    }




    public static QrCodeSegment makeEci(int assignVal)
    {
        List<int> bb = [];
        if (assignVal < 0)
            throw new ArgumentException("ECI assignment value out of range");
        else if (assignVal < (1 << 7))
            appendBits(assignVal, 8, bb);
        else if (assignVal < (1 << 14))
        {
            appendBits(0b10, 2, bb);
            appendBits(assignVal, 14, bb);
        }
        else if (assignVal < 1000000)
        {
            appendBits(0b110, 3, bb);
            appendBits(assignVal, 21, bb);
        }
        else
            throw new ArgumentException("ECI assignment value out of range");
        return new QrCodeSegment(QrCodeSegment.Mode.ECI, 0, bb);
    }




    public static bool isNumeric(string text)
    {
        return text.All(c => c is >= '0' and <= '9');
    }





    public static bool isAlphanumeric(string text)
    {
        return text.All(c => ALPHANUMERIC_CHARSET.Contains(c));
    }







    public readonly Mode mode;
    public readonly int numChars;
    private readonly List<int> bitData;
    public QrCodeSegment(Mode mode, int numChars, List<int> bitData)
    {
        this.mode = mode; this.numChars = numChars;


        if (numChars < 0)
            throw new ArgumentException("Invalid argument");
        this.bitData = bitData.ToList();
    }





    public List<int> getData()
    {
        return this.bitData.ToList();
    }




    public static int getTotalBits(List<QrCodeSegment> segs, int version)
    {
        int result = 0;
        foreach (var seg in segs)
        {
            int ccbits = seg.mode.numCharCountBits(version);
            if (seg.numChars >= (1 << ccbits))
                return int.MaxValue;
            result += 4 + ccbits + seg.bitData.Count;
        }
        return result;
    }



    private static List<int> toUtf8ByteArray(string str) => new System.Text.UTF8Encoding(false, true).GetBytes(str).Select(b => (int)b).ToList();







    private static readonly string ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";


    public sealed record Mode(int modeBits, int[] Counts)
    {
        public static readonly Mode NUMERIC = new(1, [10, 12, 14]), ALPHANUMERIC = new(2, [9, 11, 13]), BYTE = new(4, [8, 16, 16]), KANJI = new(8, [8, 10, 12]), ECI = new(7, [0, 0, 0]);
        public int numCharCountBits(int ver) => Counts[(ver + 7) / 17];
    }

}
