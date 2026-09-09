import { Document, Page, View, Image, StyleSheet, Text } from '@react-pdf/renderer';

interface StickersQrThermiquePDFProps {
  qrDataUrl: string;
  count: number;
}

const s = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    width: 164, // 58mm ≈ 164.4 pt
    paddingVertical: 6,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  sticker: {
    width: 164,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  qrImage: {
    width: 108, // 38mm ≈ 107.7 pt
    height: 108,
  },
  cutGuide: {
    width: 130,
    borderBottomWidth: 1,
    borderBottomColor: '#666666',
    borderBottomStyle: 'dashed',
    marginVertical: 6,
    alignItems: 'center',
  },
  cutText: {
    fontSize: 5.5,
    fontFamily: 'Helvetica',
    color: '#777777',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 1,
  },
});

export function StickersQrThermiquePDF({ qrDataUrl, count }: StickersQrThermiquePDFProps) {
  // Height per sticker: 108pt (QR) + 12pt (padding) + 14pt (guide) ≈ 134pt
  const stickerHeight = 134;
  const totalHeight = Math.max(134, count * stickerHeight);

  return (
    <Document>
      <Page size={[164, totalHeight]} style={s.page}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={s.sticker}>
            <Image src={qrDataUrl} style={s.qrImage} />
            {i < count - 1 && (
              <View style={s.cutGuide}>
                <Text style={s.cutText}>- - - - - - DECOUPE - - - - - -</Text>
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}
