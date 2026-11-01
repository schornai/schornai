class TrustedBox {
  #box?: BoxEndpoint;

  setBox(box?: BoxEndpoint) {
    this.#box = box;
  }

  getBox() {
    return this.#box;
  }

  isTrusted(hostname: string, certificate: Electron.Certificate) {
    if (!this.#box) {
      return false;
    }

    if (hostname !== this.#box.hostname) {
      return false;
    }

    const base64Fingerprint = certificate.fingerprint.replace("sha256/", "");
    const bytesFingerprint = Uint8Array.from(atob(base64Fingerprint), (c) =>
      c.charCodeAt(0),
    );
    const hexPairsFingerprint = Array.from(bytesFingerprint, (b) =>
      b.toString(16).padStart(2, "0").toUpperCase(),
    ).join(":");

    // das wird nicht funktionieren fingerprint sind unterschiedlich encoded
    if (hexPairsFingerprint !== this.#box.certificateFingerprint256) {
      return false;
    }

    return true;
  }
}

export const trustedBox = new TrustedBox();
