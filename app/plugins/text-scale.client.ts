import { applyTextScaleToDocument, readStoredTextScale, TEXT_SCALE_DEFAULT } from '~/utils/text-scale';

export default defineNuxtPlugin(() => {
  const stored = readStoredTextScale();
  applyTextScaleToDocument(stored ?? TEXT_SCALE_DEFAULT);

  const { loadFromServer } = useTextScale();
  void loadFromServer();
});
