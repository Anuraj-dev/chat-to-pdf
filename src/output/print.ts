// [4] OUTPUT — hand the PDF to the system print dialog. From there the user
// can print to a real printer or use Android's built-in "Save as PDF" target.

import * as Print from 'expo-print';

export async function printPdf(uri: string): Promise<void> {
  await Print.printAsync({ uri });
}
