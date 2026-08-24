/**
 * MKV Subtitle Extractor
 * Uses ts-ebml (via CDN) to read MKV file metadata via HTTP Range requests,
 * extract embedded text subtitles (SRT/ASS), and convert them to WebVTT.
 */

class MkvSubtitleExtractor {
  constructor() {
    this.decoder = typeof EBML !== 'undefined' ? new EBML.Decoder() : null;
    this.reader = typeof EBML !== 'undefined' ? new EBML.Reader() : null;
    this.subTracks = [];
    this.cues = [];
  }

  /**
   * Probes the given URL using a Range request to see if it's a valid MKV
   * and extracts subtitle track definitions.
   * Returns an array of available subtitle tracks.
   */
  async probe(url) {
    if (!this.decoder) {
      console.error('[MkvDemuxer] EBML library not found. Cannot parse MKV.');
      return [];
    }

    try {
      // Fetch the first 2MB to read EBML Header, Tracks, and Info
      // We need server to support HTTP 206 Partial Content
      const response = await fetch(url, {
        headers: { 'Range': 'bytes=0-2097152' }
      });

      if (response.status !== 206 && response.status !== 200) {
        console.warn(`[MkvDemuxer] Server returned ${response.status}. Range requests might not be supported.`);
        return [];
      }

      if (response.status === 200 && response.headers.get('content-length') > 50000000) {
         console.warn('[MkvDemuxer] Server ignored Range request (returned 200 with full size). Cannot stream-parse 50GB MKV in browser RAM.');
         // We must abort to avoid crashing the browser with huge RAM usage
         // If server doesn't support range, we can't extract subs this way.
         return [];
      }

      const buffer = await response.arrayBuffer();
      const ebmlElms = this.decoder.decode(buffer);
      
      this.reader.logging = false;
      this.reader.drop_default_extra = false;
      
      ebmlElms.forEach(elm => {
        try { this.reader.read(elm); } catch(e){}
      });

      // Find subtitle tracks
      this.subTracks = this.reader.tracks.filter(t => t.type === 'subtitle' || t.type === 0x11);
      
      const results = this.subTracks.map(t => ({
        trackNumber: t.trackNumber,
        codec: t.codecID,
        language: t.language || 'und',
        name: t.name || `Track ${t.trackNumber}`
      }));
      
      console.log(`[MkvDemuxer] Found ${results.length} embedded subtitle tracks.`, results);
      return results;

    } catch (err) {
      console.error('[MkvDemuxer] Probe failed:', err);
      return [];
    }
  }

  /**
   * Fallback for extracting subtitles if server supports full fetch or stream.
   * In a real comprehensive library (like Web-Demuxer), it reads Clusters incrementally.
   * Here we try to provide a basic mechanism to prove the capability.
   */
  async extractTrack(url, trackNumber) {
    console.log(`[MkvDemuxer] Extracting track ${trackNumber} not fully implemented in this lightweight version yet.`);
    // Full extraction requires reading the Cues element (often at the end of the file),
    // and then fetching specific byte ranges for each Cluster containing the subtitle blocks.
    // This is a placeholder for the actual extraction logic.
    return null;
  }
}

window.MkvSubtitleExtractor = MkvSubtitleExtractor;
