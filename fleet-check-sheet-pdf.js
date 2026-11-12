/**
 * Phase3 車両チェックシート PDF（クライアント完結・pdf-lib + Canvas日本語ラスター）
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ringFleetCheckSheetPdf_ = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var A4W = 595.28;
  var A4H = 841.89;
  var MARGIN = 40;
  var RASTER_W = 1060;
  var FONT_STACK = '"Hiragino Sans", "Noto Sans JP", sans-serif';
  var GAP = 10;

  function dataUrlToUint8_(dataUrl) {
    if (!dataUrl || dataUrl.indexOf('base64,') < 0) return new Uint8Array(0);
    var b64 = dataUrl.split('base64,')[1];
    if (typeof atob === 'function') {
      var bin = atob(b64);
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
    return new Uint8Array(0);
  }

  function makeMeasureCtx_(fontSize, fontWeight) {
    if (typeof document === 'undefined') {
      return { measureText: function (t) { return { width: String(t).length * (fontSize * 0.55) }; } };
    }
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.font = (fontWeight || '700') + ' ' + fontSize + 'px ' + FONT_STACK;
    return ctx;
  }

  function wrapLines_(ctx, text, maxWidth) {
    text = String(text || '');
    if (!text) return [''];
    var lines = [];
    var parts = text.split(/\n/);
    parts.forEach(function (para) {
      var buf = '';
      for (var i = 0; i < para.length; i++) {
        var ch = para.charAt(i);
        var test = buf + ch;
        if (ctx.measureText(test).width > maxWidth && buf) {
          lines.push(buf);
          buf = ch;
        } else buf = test;
      }
      if (buf) lines.push(buf);
    });
    return lines;
  }

  function expandLinesWithWrap_(ctx, rawLines, maxWidth) {
    var out = [];
    rawLines.forEach(function (ln) {
      ln = String(ln || '');
      if (!ln) {
        out.push('');
        return;
      }
      if (ctx.measureText(ln).width <= maxWidth) {
        out.push(ln);
        return;
      }
      wrapLines_(ctx, ln, maxWidth).forEach(function (w) { out.push(w); });
    });
    return out;
  }

  function lineHeightPx_(fontSize) {
    return Math.round(22 * fontSize / 13);
  }

  function rasterBlockHeightPdf_(lineCount, fontSize, hasTitle) {
    var lh = lineHeightPx_(fontSize);
    var pad = 12;
    var titleExtra = hasTitle ? lh + 6 : 0;
    var canvasH = pad * 2 + titleExtra + lineCount * lh;
    var drawW = A4W - MARGIN * 2;
    return (canvasH / RASTER_W) * drawW;
  }

  function maxLinesForHeight_(fontSize, hasTitle, availPdfH) {
    availPdfH = Math.max(40, availPdfH);
    for (var n = 250; n >= 1; n--) {
      if (rasterBlockHeightPdf_(n, fontSize, hasTitle) <= availPdfH - GAP) return n;
    }
    return 1;
  }

  function isGroupHeader_(line) {
    var s = String(line || '');
    return s.indexOf('■') === 0 || /^\s*\[(FL|FR|RL|RR)\]/.test(s);
  }

  function paginateLines_(lines, maxLines) {
    lines = lines || [];
    maxLines = Math.max(1, maxLines);
    var pages = [];
    var i = 0;
    while (i < lines.length) {
      var room = maxLines;
      var end = Math.min(i + room, lines.length);
      if (end < lines.length) {
        var best = end;
        for (var j = end; j > i; j--) {
          if (lines[j - 1] === '') {
            best = j;
            break;
          }
          if (j < lines.length && isGroupHeader_(lines[j])) {
            best = j;
            break;
          }
        }
        if (best <= i) best = Math.min(i + maxLines, lines.length);
        end = best;
      }
      if (end > i && end < lines.length && isGroupHeader_(lines[end])) {
        if (end - i < 2 && end < lines.length) {
          end = Math.min(i + maxLines, lines.length);
        }
      }
      var slice = lines.slice(i, end);
      if (slice.length > 0 && end < lines.length && isGroupHeader_(slice[slice.length - 1])) {
        end -= 1;
        slice = lines.slice(i, end);
      }
      if (!slice.length) {
        slice = lines.slice(i, Math.min(i + maxLines, lines.length));
        end = i + slice.length;
      }
      pages.push(slice);
      i = end;
      while (i < lines.length && lines[i] === '') i++;
    }
    return pages;
  }

  function rasterTextBlock_(lines, opts) {
    opts = opts || {};
    var width = opts.width || RASTER_W;
    var fontSize = opts.fontSize || 14;
    var fontWeight = opts.fontWeight || '700';
    var lh = lineHeightPx_(fontSize);
    var pad = opts.pad || 12;
    var title = opts.title || '';
    var height = pad * 2 + (title ? lh + 6 : 0) + lines.length * lh;
    if (typeof document === 'undefined') {
      return { png: new Uint8Array(0), width: width, height: Math.max(height, 40), lineHeight: lh };
    }
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.max(Math.ceil(height), 48);
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'top';
    var y = pad;
    if (title) {
      ctx.font = '900 ' + (fontSize + 2) + 'px ' + FONT_STACK;
      ctx.fillText(title, pad, y);
      y += lh + 6;
    }
    ctx.font = fontWeight + ' ' + fontSize + 'px ' + FONT_STACK;
    lines.forEach(function (ln) {
      ctx.fillText(ln, pad, y);
      y += lh;
    });
    return { png: dataUrlToUint8_(canvas.toDataURL('image/png')), width: canvas.width, height: canvas.height, lineHeight: lh };
  }

  function regionBoxFromSvg_(region) {
    var map = {
      bumper_front: { x: 130, y: 20, w: 160, h: 44 },
      body_top: { x: 80, y: 80, w: 260, h: 200 },
      side_left: { x: 20, y: 80, w: 50, h: 200 },
      side_right: { x: 350, y: 80, w: 50, h: 200 },
      bumper_rear: { x: 130, y: 296, w: 160, h: 44 },
      tire_FL: { x: 21, y: 366, w: 68, h: 68 },
      tire_FR: { x: 331, y: 366, w: 68, h: 68 },
      tire_RL: { x: 21, y: 466, w: 68, h: 68 },
      tire_RR: { x: 331, y: 466, w: 68, h: 68 }
    };
    return map[region] || map.body_top;
  }

  function diagramToPng_(C, marks) {
    if (typeof document === 'undefined' || !C) return new Uint8Array(0);
    var wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.left = '-9999px';
    wrap.style.top = '0';
    wrap.innerHTML = C.diagramSvgMarkup_();
    document.body.appendChild(wrap);
    var svg = wrap.querySelector('svg');
    var layer = wrap.querySelector('#ringCheckMarksLayerPdf');
    if (!layer && svg && svg.appendChild && document.createElementNS) {
      layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      layer.setAttribute('id', 'ringCheckMarksLayerPdf');
      svg.appendChild(layer);
    }
    if (!layer) {
      document.body.removeChild(wrap);
      return new Uint8Array(0);
    }
    var html = '';
    (marks || []).forEach(function (m) {
      var box = regionBoxFromSvg_(m.region);
      var cx = box.x + box.w * m.nx;
      var cy = box.y + box.h * m.ny;
      if (m.type === 'scratch') {
        html += '<g transform="translate(' + cx + ',' + cy + ')"><circle r="10" fill="#000"/><text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="900" fill="#fff">●</text></g>';
      } else if (m.type === 'dent') {
        html += '<g transform="translate(' + cx + ',' + cy + ')"><text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="900" fill="#000">×</text></g>';
      } else {
        html += '<g transform="translate(' + cx + ',' + cy + ')"><rect x="-10" y="-10" width="20" height="20" fill="#fff" stroke="#000" stroke-width="2"/><text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900" fill="#000">□</text></g>';
      }
    });
    layer.innerHTML = html;
    var canvas = document.createElement('canvas');
    canvas.width = 840;
    canvas.height = 1120;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var xml = new XMLSerializer().serializeToString(svg);
    var blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        document.body.removeChild(wrap);
        resolve(dataUrlToUint8_(canvas.toDataURL('image/png')));
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        document.body.removeChild(wrap);
        reject(new Error('DIAGRAM_RASTER_FAILED'));
      };
      img.src = url;
    });
  }

  function imageToPngBytes_(dataUrl) {
    return dataUrlToUint8_(dataUrl);
  }

  function buildInspectionLines_(C, record) {
    var lines = [];
    var insp = record.inspection;
    C.INSPECTION_SECTIONS.forEach(function (sec) {
      lines.push('■ ' + sec.title);
      var block = insp.sections[sec.id];
      sec.items.forEach(function (it) {
        var st = block.items[it.key].status;
        lines.push('  · ' + it.label + '：' + C.STATUS_LABELS[st]);
        if (block.items[it.key].memo) lines.push('    メモ: ' + block.items[it.key].memo);
      });
      if (block.sectionMemo) lines.push('  区分メモ: ' + block.sectionMemo);
      lines.push('');
    });
    lines.push('■ タイヤ4輪');
    C.TIRE_WHEELS.forEach(function (w) {
      var tw = insp.tires[w];
      lines.push('  [' + w + ']');
      C.TIRE_CHECKS.forEach(function (tc) {
        var st = tw.items[tc.key].status;
        var extra = '';
        if (tc.key === 'pressure' && tw.pressureValue) {
          extra = '（実測 ' + tw.pressureValue + ' ' + (tw.pressureUnit || 'kPa') + '）';
        }
        lines.push('    · ' + tc.label + '：' + C.STATUS_LABELS[st] + extra);
        if (tw.items[tc.key].memo) lines.push('      メモ: ' + tw.items[tc.key].memo);
      });
      if (tw.wheelMemo) lines.push('    区分メモ: ' + tw.wheelMemo);
    });
    return lines;
  }

  function buildMarkLines_(C, marks) {
    var labels = { scratch: '傷', dent: 'へこみ', other: 'その他' };
    return (marks || []).map(function (m, i) {
      return (i + 1) + '. ' + C.markSymbol_(m.type) + labels[m.type] + ' / ' + m.region + (m.memo ? ' — ' + m.memo : '');
    });
  }

  function countPdfPages_(pdfBytes) {
    var s = '';
    if (typeof Buffer !== 'undefined') s = Buffer.from(pdfBytes).toString('latin1');
    else if (pdfBytes && pdfBytes.length) {
      var arr = pdfBytes;
      for (var i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
    }
    var matches = s.match(/\/Type\s*\/Page[^s\w]/g);
    return matches ? matches.length : 0;
  }

  async function generateCheckSheetPdf_(opts) {
    opts = opts || {};
    var C = opts.core;
    var PDFLib = opts.PDFLib || (typeof PDFLib !== 'undefined' ? PDFLib : null);
    if (!C || !PDFLib) throw new Error('PDF_LIBS_UNAVAILABLE');
    var record = C.normalizeRecord_(opts.record || {});
    var vehicle = opts.vehicle || {};
    var marks = C.cloneMarks_(opts.marks || record.marks || []);
    var photos = Array.isArray(opts.photos) ? opts.photos.slice(0, C.PHOTO_MAX) : [];

    var pdfDoc = await PDFLib.PDFDocument.create();
    var page = pdfDoc.addPage([A4W, A4H]);
    var y = A4H - MARGIN;
    var drawW = A4W - MARGIN * 2;
    var fullPageH = A4H - MARGIN * 2;

    function ensureSpace_(neededH) {
      if (y - neededH < MARGIN) {
        page = pdfDoc.addPage([A4W, A4H]);
        y = A4H - MARGIN;
      }
    }

    async function drawRasterBlock_(title, lines, fontSize) {
      var block = rasterTextBlock_(lines, { title: title, fontSize: fontSize || 13 });
      var drawH = (block.height / block.width) * drawW;
      ensureSpace_(drawH);
      var png = await pdfDoc.embedPng(block.png);
      page.drawImage(png, { x: MARGIN, y: y - drawH, width: drawW, height: drawH });
      y -= drawH + GAP;
    }

    async function addRasterPaginated_(title, rawLines, fontSize) {
      fontSize = fontSize || 13;
      var ctx = makeMeasureCtx_(fontSize);
      var wrapped = expandLinesWithWrap_(ctx, rawLines, RASTER_W - 24);
      var pageIdx = 0;
      var pos = 0;
      while (pos < wrapped.length) {
        var avail = y - MARGIN;
        var maxLines = maxLinesForHeight_(fontSize, pageIdx === 0, avail);
        if (maxLines < 1) {
          page = pdfDoc.addPage([A4W, A4H]);
          y = A4H - MARGIN;
          pageIdx = 0;
          avail = y - MARGIN;
          maxLines = maxLinesForHeight_(fontSize, true, avail);
        }
        var chunkPages = paginateLines_(wrapped.slice(pos), maxLines);
        var chunk = chunkPages[0] || [];
        if (!chunk.length) break;
        var chunkTitle = pageIdx === 0 ? title : (title + '（続き）');
        var block = rasterTextBlock_(chunk, { title: chunkTitle, fontSize: fontSize });
        var drawH = (block.height / block.width) * drawW;
        if (drawH > fullPageH - GAP) {
          chunk = chunk.slice(0, Math.max(1, Math.floor(chunk.length / 2)));
          block = rasterTextBlock_(chunk, { title: chunkTitle, fontSize: fontSize });
          drawH = (block.height / block.width) * drawW;
        }
        ensureSpace_(drawH);
        var png = await pdfDoc.embedPng(block.png);
        page.drawImage(png, { x: MARGIN, y: y - drawH, width: drawW, height: drawH });
        y -= drawH + GAP;
        pos += chunk.length;
        pageIdx++;
      }
    }

    var metaLines = [
      '点検用途：' + C.purposeLabel_(record.meta.purpose),
      '点検日：' + record.meta.inspectionDate,
      '車両名：' + String(vehicle.displayName || vehicle.nickname || vehicle.vin || ''),
      '区分：' + String(vehicle.categoryLabel || ''),
      'ナンバー：' + (typeof ringFormatFleetPlateDisplay_ === 'function'
        ? (ringFormatFleetPlateDisplay_(vehicle) || '未登録') : String(vehicle.plateSuffix || '未登録')),
      'VIN：' + String(vehicle.vin || record.vin || ''),
      '走行距離：' + (record.meta.odometerKm ? record.meta.odometerKm + ' km' : '未入力'),
      '燃料残量：' + C.fuelLabel_(record.meta.fuelLevel),
      '記録ID：' + record.recordId
    ];

    await drawRasterBlock_('RinG-Auto 車両チェックシート', metaLines, 15);
    await addRasterPaginated_('日常点検結果', buildInspectionLines_(C, record), 12);
    await addRasterPaginated_('マーク別メモ', buildMarkLines_(C, marks).length ? buildMarkLines_(C, marks) : ['（マークなし）'], 12);

    if (record.meta.overallMemo) {
      var memoCtx = makeMeasureCtx_(12);
      var memoLines = expandLinesWithWrap_(memoCtx, [record.meta.overallMemo], RASTER_W - 24);
      await addRasterPaginated_('総合メモ', memoLines, 12);
    }

    var diagramPng = await diagramToPng_(C, marks);
    if (diagramPng.length) {
      var dpng = await pdfDoc.embedPng(diagramPng);
      var dH = drawW * (1120 / 840);
      ensureSpace_(dH);
      page.drawImage(dpng, { x: MARGIN, y: y - dH, width: drawW, height: dH });
      y -= dH + GAP;
    }

    for (var pi = 0; pi < photos.length; pi++) {
      var ph = photos[pi];
      if (!ph || !ph.dataUrl) continue;
      var bytes = imageToPngBytes_(ph.dataUrl);
      if (!bytes.length) continue;
      var embed;
      try {
        if (ph.dataUrl.indexOf('image/png') >= 0) embed = await pdfDoc.embedPng(bytes);
        else embed = await pdfDoc.embedJpg(bytes);
      } catch (e) {
        continue;
      }
      page = pdfDoc.addPage([A4W, A4H]);
      y = A4H - MARGIN;
      var pW = drawW;
      var pH = pW * 0.65;
      var photoTitle = '写真 ' + (pi + 1) + (ph.caption ? ' — ' + ph.caption : '');
      var titleBlock = rasterTextBlock_([''], { title: photoTitle, fontSize: 12 });
      var titleH = (titleBlock.height / titleBlock.width) * drawW;
      ensureSpace_(titleH + pH);
      var titlePng = await pdfDoc.embedPng(titleBlock.png);
      page.drawImage(titlePng, { x: MARGIN, y: y - titleH, width: drawW, height: titleH });
      y -= titleH + GAP;
      page.drawImage(embed, { x: MARGIN, y: y - pH, width: pW, height: pH });
      y -= pH + GAP;
    }

    var sigLines = ['担当者署名：', '_________________________________', '確認日：____年____月____日'];
    var sigBlockH = rasterBlockHeightPdf_(sigLines.length, 14, true);
    ensureSpace_(sigBlockH);
    await drawRasterBlock_('署名欄（手書き記入）', sigLines, 14);

    var pages = pdfDoc.getPages();
    for (var i = 0; i < pages.length; i++) {
      pages[i].drawText(String(i + 1) + ' / ' + pages.length, {
        x: A4W - MARGIN - 40,
        y: 20,
        size: 9
      });
    }

    var pdfBytes = await pdfDoc.save();
    return {
      bytes: pdfBytes,
      fileName: C.pdfFileName_(new Date()),
      pageCount: pages.length
    };
  }

  return {
    generateCheckSheetPdf_: generateCheckSheetPdf_,
    rasterTextBlock_: rasterTextBlock_,
    dataUrlToUint8_: dataUrlToUint8_,
    diagramToPng_: diagramToPng_,
    buildInspectionLines_: buildInspectionLines_,
    expandLinesWithWrap_: expandLinesWithWrap_,
    paginateLines_: paginateLines_,
    rasterBlockHeightPdf_: rasterBlockHeightPdf_,
    countPdfPages_: countPdfPages_,
    makeMeasureCtx_: makeMeasureCtx_,
    A4W: A4W,
    A4H: A4H,
    MARGIN: MARGIN,
    RASTER_W: RASTER_W
  };
});
