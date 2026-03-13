/**
 * Browser Fingerprinting Utility
 * Privacy-friendly fingerprinting using a one-way hash of browser signals.
 * No cookies, no persistent storage. Uses:
 *   - User-Agent string
 *   - Accept-Language header
 *   - Screen resolution (client-side)
 *   - Timezone (client-side)
 *   - Canvas hash (client-side)
 *   - Color depth (client-side)
 *   - Platform (from UA or client-side)
 */

const crypto = require('crypto')

/**
 * Generate a fingerprint hash from available signals.
 * Server-side signals are always available; client-side signals are optional.
 */
function generateFingerprint({ user_agent, accept_language, screen_resolution, timezone, canvas_hash, color_depth, platform }) {
  const components = [
    user_agent || '',
    accept_language || '',
    screen_resolution || '',
    timezone || '',
    canvas_hash || '',
    String(color_depth || ''),
    platform || '',
  ]

  const raw = components.join('|||')
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/**
 * Extract server-side fingerprint signals from an Express request object.
 */
function extractServerSignals(req) {
  const user_agent = req.headers['user-agent'] || null
  const accept_language = req.headers['accept-language'] || null
  const referer = req.headers['referer'] || req.headers['referrer'] || null

  // Extract IP (handle proxies)
  const ip_address =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.ip ||
    null

  // Basic platform extraction from UA
  const platform = extractPlatform(user_agent)

  return {
    user_agent,
    accept_language,
    referer,
    ip_address,
    platform,
  }
}

/**
 * Extract platform/OS from User-Agent string
 */
function extractPlatform(ua) {
  if (!ua) return null
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Mac OS X|macOS/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua)) return 'Linux'
  if (/CrOS/i.test(ua)) return 'ChromeOS'
  return 'Other'
}

/**
 * Generate the client-side fingerprint collection script.
 * This script collects canvas hash, screen resolution, timezone, etc.
 * and sends them back to the server via a beacon/fetch call.
 * 
 * Returns minified JS string to embed in a tracking page.
 */
function getClientFingerprintScript(clickEventId, beaconUrl) {
  return `(function(){
  try{
    var d={};
    d.sr=screen.width+'x'+screen.height;
    d.tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';
    d.cd=screen.colorDepth||0;
    d.p=navigator.platform||'';
    var c=document.createElement('canvas');
    c.width=200;c.height=50;
    var ctx=c.getContext('2d');
    ctx.textBaseline='top';
    ctx.font='14px Arial';
    ctx.fillStyle='#f60';
    ctx.fillRect(0,0,100,50);
    ctx.fillStyle='#069';
    ctx.fillText('Lf~fp!@#',2,2);
    ctx.fillStyle='rgba(102,204,0,0.7)';
    ctx.fillText('Lf~fp!@#',4,4);
    var h=0,s=c.toDataURL();
    for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}
    d.ch=Math.abs(h).toString(16);
    d.id=${clickEventId};
    if(navigator.sendBeacon){
      navigator.sendBeacon('${beaconUrl}',JSON.stringify(d));
    }else{
      var x=new XMLHttpRequest();
      x.open('POST','${beaconUrl}',true);
      x.setRequestHeader('Content-Type','application/json');
      x.send(JSON.stringify(d));
    }
  }catch(e){}
})();`
}

module.exports = {
  generateFingerprint,
  extractServerSignals,
  extractPlatform,
  getClientFingerprintScript,
}
