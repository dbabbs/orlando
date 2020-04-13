const credentials = {
  id: "7Fs4xShlBdXXSRhSKKjv",
  code: "9KLK-ZDQIbNbYFcQYM5uVQ",
  xyzId: "fYhuyi7V",
  xyzToken: "AGrdMdqrcvM-4h-0PXlBi8U",
  apikey: "qHbGACVC8wUgzipkERYFIvbK8ASY9UhPsKSGTB7quRI",
};

const colors = {
  exists: (a) => `rgba(101,99,226, ${a})`,
  planned: (a) => `rgba(255, 122, 142, ${a})`,
  recommended: (a) => `rgba(121, 247, 202, ${a})`,
};

const pinColor = "black";

const labels = {
  exists: "Existing station range",
  planned: "Planned station range",
  recommended: "Recommended future station range",
};

const scene = "resources/scene.yaml";

export { credentials, colors, pinColor, labels, scene };
