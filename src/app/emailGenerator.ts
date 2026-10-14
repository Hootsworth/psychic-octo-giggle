export interface EmailGenerationOptions {
  issue: {
    id: string;
    title: string;
    week?: string;
    status?: string;
  };
  pages: Array<Array<{
    id: string;
    type: string;
    width: number;
    height: string;
    content?: Record<string, any>;
  }>>;
  palette?: {
    accent: string;
    paper: string;
    ink: string;
  };
  publicationName?: string;
  senderName?: string;
  senderEmail?: string;
  subject?: string;
  previewText?: string;
  webReadUrl?: string;
  unsubscribeUrl?: string;
}

const DEFAULT_PALETTE = {
  accent: "#ef5a35",
  paper: "#f8f5ed",
  ink: "#171714",
};

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanHtmlFormatting(rawHtml: string): string {
  if (!rawHtml) return "";
  // If it already has HTML tags like <b>, <i>, <a>, keep them safe
  return rawHtml
    .replace(/<div><br><\/div>/gi, "<br>")
    .replace(/<div>/gi, "<br>")
    .replace(/<\/div>/gi, "")
    .replace(/<p><\/p>/gi, "");
}

/**
 * Extracts live rendered text and images from the active DOM canvas if available,
 * allowing live-edited text in the editor to immediately appear in the email.
 */
export function extractLiveContentMap(): Record<string, { eyebrow?: string; title?: string; byline?: string; body?: string; image?: string }> {
  const map: Record<string, { eyebrow?: string; title?: string; byline?: string; body?: string; image?: string }> = {};
  if (typeof document === "undefined") return map;

  const blocks = document.querySelectorAll<HTMLElement>("#pdf-document .builder-block");
  blocks.forEach((block) => {
    const sectionId = block.getAttribute("data-section-id");
    if (!sectionId) return;

    const editables = Array.from(block.querySelectorAll<HTMLElement>(".editable"));
    const imgEl = block.querySelector<HTMLImageElement>("img");
    const image = imgEl?.src || undefined;

    if (editables.length === 1) {
      map[sectionId] = { body: editables[0].innerHTML, image };
    } else if (editables.length === 2) {
      map[sectionId] = { title: editables[0].innerHTML, body: editables[1].innerHTML, image };
    } else if (editables.length >= 3) {
      map[sectionId] = {
        eyebrow: editables[0].innerHTML,
        title: editables[1].innerHTML,
        byline: editables[2].innerHTML,
        body: editables.slice(3).map((e) => e.innerHTML).join("<br><br>"),
        image,
      };
    }
  });

  return map;
}

/**
 * Generates an email-client safe, responsive table-based HTML email.
 */
export function generateEmailHtml(options: EmailGenerationOptions): string {
  const {
    issue,
    pages,
    palette = DEFAULT_PALETTE,
    publicationName = "In Other Words",
    senderName = "University Editorial Desk",
    senderEmail = "newsletter@university.edu",
    previewText = "Weekly notes, campus voices & everything in between.",
    webReadUrl = `https://newsletter.singulr.tech/read/${issue.id}`,
    unsubscribeUrl = "https://newsletter.singulr.tech/unsubscribe",
  } = options;

  const accent = palette.accent || "#ef5a35";
  const paper = palette.paper || "#f8f5ed";
  const ink = palette.ink || "#171714";

  const liveMap = extractLiveContentMap();

  // Flatten all sections in page sequence
  const allSections = pages.flat();

  let bodyContentHtml = "";

  for (const section of allSections) {
    const live = liveMap[section.id] || {};
    const content = section.content || {};

    const eyebrow = live.eyebrow || content.eyebrow || "";
    const title = live.title || content.title || "";
    const byline = live.byline || content.byline || "";
    const body = live.body || content.body || "";
    const image = live.image || (section.type === "photo" ? "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1200" : undefined);

    if (section.type === "cover") {
      bodyContentHtml += `
      <!-- COVER SECTION -->
      <tr>
        <td style="padding: 36px 32px 28px 32px; background-color: ${paper}; border-bottom: 2px solid ${ink};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td>
                <p style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: ${accent};">
                  ${escapeHtml(eyebrow || "The Campus Weekly Edition")}
                </p>
                <h1 style="margin: 0 0 16px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 34px; line-height: 1.1; font-weight: 700; color: ${ink}; letter-spacing: -0.5px;">
                  ${cleanHtmlFormatting(title || issue.title || "Back to where ideas begin.")}
                </h1>
                <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.5; color: #555550; font-style: italic;">
                  ${cleanHtmlFormatting(body || "Weekly notes, student voices & everything in between.")}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `;
    } else if (section.type === "heading") {
      bodyContentHtml += `
      <!-- HEADING SECTION -->
      <tr>
        <td style="padding: 28px 32px 14px 32px; background-color: ${paper}; border-bottom: 1px solid #e2ddd4;">
          ${eyebrow ? `<p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: ${accent};">${escapeHtml(eyebrow)}</p>` : ""}
          <h2 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; line-height: 1.2; font-weight: 700; color: ${ink};">
            ${cleanHtmlFormatting(title || "Section Heading")}
          </h2>
        </td>
      </tr>
      `;
    } else if (section.type === "article") {
      bodyContentHtml += `
      <!-- ARTICLE SECTION -->
      <tr>
        <td style="padding: 28px 32px; background-color: ${paper}; border-bottom: 1px solid #e2ddd4;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${eyebrow ? `
            <tr>
              <td>
                <span style="display: inline-block; padding: 3px 8px; background-color: ${accent}; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 2px; margin-bottom: 12px;">
                  ${escapeHtml(eyebrow)}
                </span>
              </td>
            </tr>` : ""}
            <tr>
              <td>
                <h3 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; line-height: 1.2; font-weight: 700; color: ${ink};">
                  ${cleanHtmlFormatting(title || "A new week, a blank page.")}
                </h3>
                ${byline ? `<p style="margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #777770;">${escapeHtml(byline)}</p>` : ""}
                <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.7; color: #2a2a26;">
                  ${cleanHtmlFormatting(body || "The campus feels different in September. New notebooks, old buildings, and the pleasant sense that anything might happen.")}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `;
    } else if (section.type === "photo" || section.type === "gallery") {
      bodyContentHtml += `
      <!-- PHOTO / GALLERY SECTION -->
      <tr>
        <td style="padding: 24px 32px; background-color: ${paper}; border-bottom: 1px solid #e2ddd4;">
          ${image ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td align="center">
                <img src="${image}" alt="Issue feature photo" width="536" style="width: 100%; max-width: 536px; height: auto; display: block; border-radius: 4px; border: 1px solid #dcd7ce;" />
              </td>
            </tr>
            ${body ? `
            <tr>
              <td style="padding-top: 10px;">
                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; line-height: 1.4; color: #666660; font-style: italic;">
                  ${cleanHtmlFormatting(body)}
                </p>
              </td>
            </tr>` : ""}
          </table>` : ""}
        </td>
      </tr>
      `;
    } else if (section.type === "poem") {
      bodyContentHtml += `
      <!-- POETRY SECTION -->
      <tr>
        <td style="padding: 30px 32px; background-color: ${paper}; border-bottom: 1px solid #e2ddd4;">
          <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: ${accent};">
            ${escapeHtml(eyebrow || "Featured Poem")}
          </p>
          <h3 style="margin: 0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 700; color: ${ink};">
            ${cleanHtmlFormatting(title || "Library at 4:17")}
          </h3>
          ${byline ? `<p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #777770;">${escapeHtml(byline)}</p>` : ""}
          <div style="border-left: 2px solid ${ink}; padding-left: 20px; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-style: italic; line-height: 1.8; color: #2a2a26;">
            ${cleanHtmlFormatting(body || "The afternoon leans<br>through tall windows,<br>dust turning slowly<br>like a thought<br>we haven’t finished.")}
          </div>
        </td>
      </tr>
      `;
    } else if (section.type === "quote") {
      bodyContentHtml += `
      <!-- PULL QUOTE SECTION -->
      <tr>
        <td style="padding: 36px 32px; background-color: ${accent}; color: #ffffff; border-bottom: 1px solid #e2ddd4;">
          <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; opacity: 0.85;">
            In Their Own Words
          </p>
          <blockquote style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; line-height: 1.4; font-style: italic; font-weight: 400;">
            ${cleanHtmlFormatting(body || "“The university is not just where we learn. It is what we make together.”")}
          </blockquote>
          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">
            — Campus Contributor
          </p>
        </td>
      </tr>
      `;
    } else if (section.type === "events") {
      bodyContentHtml += `
      <!-- EVENTS SECTION -->
      <tr>
        <td style="padding: 28px 32px; background-color: ${paper}; border-bottom: 1px solid #e2ddd4;">
          <h3 style="margin: 0 0 16px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 700; color: ${ink};">
            ${cleanHtmlFormatting(title || "This Week on Campus")}
          </h3>
          <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.7; color: #2a2a26;">
            ${body ? cleanHtmlFormatting(body) : `
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="padding: 10px 0; border-top: 1px solid #e2ddd4;">
                  <strong style="color: ${accent}; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px;">MON 22</strong> — <span style="font-weight: bold;">Open mic night</span> · Student Union · 7:30 PM
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-top: 1px solid #e2ddd4;">
                  <strong style="color: ${accent}; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px;">WED 24</strong> — <span style="font-weight: bold;">Astronomy Club stargazing</span> · East Lawn · 9:00 PM
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-top: 1px solid #e2ddd4;">
                  <strong style="color: ${accent}; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px;">SAT 27</strong> — <span style="font-weight: bold;">Autumn societies fair</span> · Main Quad · 11:00 AM
                </td>
              </tr>
            </table>
            `}
          </div>
        </td>
      </tr>
      `;
    } else if (section.type === "notice") {
      const qrUrl = content.qrUrl || webReadUrl;
      const qrLabel = content.qrLabel || "Submit Work / RSVP Online →";
      bodyContentHtml += `
      <!-- NOTICEBOARD SECTION -->
      <tr>
        <td style="padding: 28px 32px; background-color: #f1ede3; border-bottom: 1px solid #e2ddd4;">
          <div style="border: 2px solid ${ink}; padding: 24px; border-radius: 4px; background-color: #ffffff;">
            <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: ${accent};">
              ${escapeHtml(eyebrow || "Noticeboard & Announcements")}
            </p>
            <h3 style="margin: 0 0 10px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 700; color: ${ink};">
              ${cleanHtmlFormatting(title || "Submit your work")}
            </h3>
            <p style="margin: 0 0 18px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.6; color: #444440;">
              ${cleanHtmlFormatting(body || "Poetry, short fiction, essays, photography, illustration, or fragments we don’t have a name for yet.")}
            </p>
            <!-- Bulletproof Button -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" bgcolor="${accent}" style="border-radius: 4px;">
                  <a href="${qrUrl}" target="_blank" style="padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; text-decoration: none; display: inline-block;">
                    ${escapeHtml(qrLabel)}
                  </a>
                </td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
      `;
    } else if (section.type === "sudoku" || section.type === "crossword" || section.type === "wordsearch") {
      const puzzleTitle = section.type === "sudoku" ? "Sudoku Puzzle" : section.type === "crossword" ? "Campus Mini Crossword" : "Campus Word Search";
      bodyContentHtml += `
      <!-- INTERACTIVE PUZZLE EMAIL FALLBACK CARD -->
      <tr>
        <td style="padding: 28px 32px; background-color: ${paper}; border-bottom: 1px solid #e2ddd4;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px dashed ${ink}; padding: 20px; border-radius: 4px; background-color: #faf8f2;">
            <tr>
              <td>
                <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: ${accent};">
                  Campus Recreation Desk
                </p>
                <h3 style="margin: 0 0 8px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 700; color: ${ink};">
                  ${puzzleTitle}
                </h3>
                <p style="margin: 0 0 16px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.5; color: #555550;">
                  This week's edition features an interactive ${puzzleTitle}. Play, fill in answers, and track your time in our live digital reader.
                </p>
                <!-- Bulletproof CTA Button -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="${ink}" style="border-radius: 4px;">
                      <a href="${webReadUrl}" target="_blank" style="padding: 10px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; text-decoration: none; display: inline-block;">
                        Play ${puzzleTitle} Online →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `;
    } else if (section.type === "audio") {
      bodyContentHtml += `
      <!-- AUDIO EPISODE CARD -->
      <tr>
        <td style="padding: 24px 32px; background-color: ${paper}; border-bottom: 1px solid #e2ddd4;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #dcd7ce; padding: 18px; border-radius: 4px; background-color: #ffffff;">
            <tr>
              <td>
                <span style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${accent};">Campus Audio</span>
                <h4 style="margin: 8px 0 6px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 700; color: ${ink};">
                  ${cleanHtmlFormatting(title || "Audio Feature & Playlist")}
                </h4>
                <p style="margin: 0 0 14px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.5; color: #555550;">
                  ${cleanHtmlFormatting(body || "Tune into the curated audio tracks and podcast clips selected for this edition.")}
                </p>
                <a href="${webReadUrl}" target="_blank" style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${accent}; text-decoration: underline;">
                  Listen in Web Edition →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `;
    } else if (section.type === "divider") {
      bodyContentHtml += `
      <!-- SECTION DIVIDER -->
      <tr>
        <td style="padding: 16px 32px; background-color: ${paper}; text-align: center;">
          <div style="height: 1px; background-color: #dcd7ce; margin: 12px 0;"></div>
        </td>
      </tr>
      `;
    } else {
      // General fallback for interview, stats, timeline, etc.
      bodyContentHtml += `
      <!-- EDITORIAL BLOCK (${section.type.toUpperCase()}) -->
      <tr>
        <td style="padding: 24px 32px; background-color: ${paper}; border-bottom: 1px solid #e2ddd4;">
          ${title ? `<h3 style="margin: 0 0 10px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 700; color: ${ink};">${cleanHtmlFormatting(title)}</h3>` : ""}
          <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.6; color: #2a2a26;">
            ${cleanHtmlFormatting(body || title || "")}
          </div>
        </td>
      </tr>
      `;
    }
  }

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(options.subject || issue.title || publicationName)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Client-specific Resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #eeece6; }

    /* Responsive Mobile Media Queries */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .headline-responsive { font-size: 28px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #eeece6; font-family: Georgia, 'Times New Roman', serif;">

  <!-- HIDDEN PREHEADER SPAN (Shows in inbox snippet, hidden in email body) -->
  <div style="display: none; font-size: 1px; color: #f8f5ed; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${escapeHtml(previewText)}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- OUTER BACKGROUND TABLE -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#eeece6">
    <tr>
      <td align="center" style="padding: 24px 12px 48px 12px;">
        
        <!-- HEADER TOP BAR: VIEW IN BROWSER -->
        <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin-bottom: 12px;">
          <tr>
            <td align="left" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #777770;">
              ${escapeHtml(publicationName)} · ${escapeHtml(issue.week || "Weekly Issue")}
            </td>
            <td align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
              <a href="${webReadUrl}" target="_blank" style="color: ${accent}; text-decoration: underline; font-weight: 700;">
                Read in browser ↗
              </a>
            </td>
          </tr>
        </table>

        <!-- MAIN CONTENT CONTAINER (600px) -->
        <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: ${paper}; border: 1px solid #d8d4ca; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden;">
          
          <!-- BRAND MASTHEAD -->
          <tr>
            <td align="center" style="padding: 18px 24px; background-color: ${ink}; color: #ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <span style="font-family: Georgia, serif; font-size: 20px; font-style: italic; letter-spacing: 1px; color: #ffffff;">
                      ${escapeHtml(publicationName)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- INJECTED BODY SECTIONS -->
          ${bodyContentHtml}

          <!-- FOOTER & UNPUBLISH / COMPLIANCE -->
          <tr>
            <td style="padding: 36px 32px; background-color: #f1ede3; border-top: 2px solid #dcd7ce; text-align: center;">
              <p style="margin: 0 0 10px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-style: italic; color: ${ink};">
                “Until next week, stay curious.”
              </p>
              <div style="height: 1px; width: 60px; background-color: ${accent}; margin: 16px auto;"></div>
              
              <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555550;">
                Published by ${escapeHtml(senderName)}
              </p>
              
              <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #777770; line-height: 1.5;">
                You are receiving this edition because you subscribed to updates from ${escapeHtml(publicationName)}.<br>
                To contact the editorial team, reply directly or write to <a href="mailto:${senderEmail}" style="color: ${accent}; text-decoration: underline;">${escapeHtml(senderEmail)}</a>.
              </p>

              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #999990; text-transform: uppercase; letter-spacing: 1px;">
                <a href="${unsubscribeUrl}" target="_blank" style="color: #666660; text-decoration: underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${webReadUrl}" target="_blank" style="color: #666660; text-decoration: underline;">Digital Archive</a>
                &nbsp;·&nbsp;
                <a href="https://newsletter.singulr.tech/submit" target="_blank" style="color: #666660; text-decoration: underline;">Submit Work</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Sends a live test email via Resend API.
 * If no key is provided, performs a validated test simulation.
 */
export async function sendTestEmailViaResend(options: {
  apiKey?: string;
  from?: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; id?: string; error?: string; simulated?: boolean }> {
  const { apiKey, from = "In Other Words <onboarding@resend.dev>", to, subject, html } = options;

  if (!to || !to.includes("@")) {
    return { success: false, error: "Please provide a valid recipient email address." };
  }

  // If user has provided a real Resend API key, make the real API request
  if (apiKey && apiKey.trim().startsWith("re_")) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to.trim()],
          subject,
          html,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Resend API error (${response.status})`,
        };
      }

      return { success: true, id: data.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to dispatch email via Resend API",
      };
    }
  }

  // Simulated Test Mode (when no API key is supplied yet)
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    success: true,
    id: `sim-${Date.now()}`,
    simulated: true,
  };
}
