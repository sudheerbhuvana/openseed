export interface LiveDistroVerification {
  id: string;
  name: string;
  version: string;
  architecture: "x86_64" | "amd64" | "arm64";
  releaseDate: string;
  fileName: string;
  checksumType: "SHA-256";
  checksumValue: string;
  checksumFileUrl: string;
  gpgSignatureUrl?: string;
  releaseNotesUrl: string;
  installGuideUrl: string;
  upstreamUrl: string;
  bitTorrentInfoHash?: string;
  verifiedLiveAt: string;
  isDynamicUpstream: boolean;
}

