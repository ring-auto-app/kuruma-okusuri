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

  function diagramToPng_(C, marks, positions, interior) {
    if (typeof document === 'undefined' || !C) return new Uint8Array(0);
    var wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.left = '-9999px';
    wrap.style.top = '0';
    wrap.innerHTML = interior?C.interiorSvgMarkup_():C.diagramSvgMarkup_();
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
      var point = C.markPointOnSvg_(svg, m);
      if (!point) return;
      var cx = point.x, cy = point.y;
      if (positions) positions.push({id:m.id, region:m.region, x:cx, y:cy});
      if(interior){
        html+='<g transform="translate('+cx+','+cy+')"><text text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="24" font-weight="700" fill="#000">'+(C.INTERIOR_TYPES[m.type]||'')+'</text></g>';
      } else if (m.type === 'scratch') {
        html += '<g transform="translate(' + cx + ',' + cy + ')"><circle r="10" fill="#000"/></g>';
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
    var largeLabels=document.createElementNS('http://www.w3.org/2000/svg','style');largeLabels.textContent='.rl{font-size:18px}.il{font-size:18px}';svg.appendChild(largeLabels);
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

  /** Draw in PDF points at 3x resolution. All overflow notes are preserved in appended pages. */
  async function generateCheckSheetPdf_(opts) {
    opts = opts || {};
    var C = opts.core, lib = opts.PDFLib || (typeof window !== 'undefined' && window.PDFLib);
    if (!C || !lib || typeof document === 'undefined') throw new Error('PDF_ENV_UNAVAILABLE');
    var record = C.normalizeRecord_(JSON.parse(JSON.stringify(opts.record || {})));
    var vehicle = opts.vehicle || {}, marks = C.cloneMarks_(opts.marks || record.marks || []);
    var photos = (opts.photos || []).filter(function(p){return p && p.dataUrl;});
    if (photos.length > C.PHOTO_MAX) throw new Error('PHOTO_LIMIT');
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var pdfDoc = await lib.PDFDocument.create(), layouts = [], pageCanvases = [];
    var navy = '#18344e', blue = '#e9f1f8', grey = '#526272', ink = '#162c40';
    var margin = 28, width = A4W - margin * 2, gap = 14, leftW = 280, rightW = width - leftW - gap;
    var ctx, canvas, pageLayout, pageIndex = 0;
    function newCanvas_() {
      canvas = document.createElement('canvas'); canvas.width = Math.ceil(A4W * 3); canvas.height = Math.ceil(A4H * 3);
      ctx = canvas.getContext('2d'); ctx.scale(3,3); ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,A4W,A4H);
      ctx.textBaseline = 'top'; pageLayout = []; layouts.push(pageLayout); pageCanvases.push(canvas); pageIndex++;
    }
    function font_(size, bold) { ctx.font = (bold ? '700 ' : '400 ') + size + 'px ' + FONT_STACK; }
    function lines_(text, w, size) { font_(size,false); return wrapLines_(ctx,String(text || ''),w); }
    function text_(text,x,y,w,size,bold,color,kind) {
      var lines = lines_(text,w,size), lh = size * 1.4;
      font_(size,bold); ctx.fillStyle = color || ink;
      lines.forEach(function(line,i){ctx.fillText(line,x,y+i*lh);});
      var h = lines.length * lh;
      pageLayout.push({type:kind || 'text',text:String(text),x:x,y:y,width:w,height:h,fontSize:size}); return h;
    }
    function fill_(x,y,w,h,color) { ctx.fillStyle=color;ctx.fillRect(x,y,w,h); }
    function heading_(title,x,y,w) { fill_(x,y,w,21,blue);text_(title,x+7,y+4,w-14,10,true,navy);return y+25; }
    function title_(subtitle) {
      fill_(margin,24,4,29,navy);text_('貸出・返却 チェックシート',margin+13,26,width-20,18,true,navy);
      if(subtitle)text_(subtitle,margin,63,width,10,false,grey);
    }
    var positions = [], insidePositions=[], diagramBytes = await diagramToPng_(C,marks,positions), insideBytes=await diagramToPng_(C,record.interiorMarks,insidePositions,true);
    async function image_(data) {
      return new Promise(function(resolve,reject){var img=new Image();img.onload=function(){resolve(img);};img.onerror=function(){reject(new Error('PHOTO_DECODE_FAILED'));};img.src=data;});
    }
    function fitImage_(img,x,y,w,h,type) {
      var factor=Math.min(w/img.width,h/img.height),dw=img.width*factor,dh=img.height*factor;
      var dx=x+(w-dw)/2,dy=y+(h-dh)/2;ctx.drawImage(img,dx,dy,dw,dh);
      pageLayout.push({type:type,x:dx,y:dy,width:dw,height:dh,sourceWidth:img.width,sourceHeight:img.height});
    }
    var notes=[];
    function note_(label,value){if(value)notes.push(label+'：'+value);}
    note_('共通メモ',record.meta.overallMemo);
    C.INSPECTION_SECTIONS.forEach(function(sec){var block=record.inspection.sections[sec.id];note_(sec.title,block.sectionMemo);sec.items.forEach(function(it){note_(sec.title+' / '+it.label,block.items[it.key].memo);});});
    C.TIRE_WHEELS.forEach(function(w){var t=record.inspection.tires[w];note_('タイヤ '+w,t.wheelMemo);C.TIRE_CHECKS.forEach(function(it){note_(w+' / '+it.label,t.items[it.key].memo);});});
    var regionLabels={body_top:'車体上面',bumper_front:'前バンパー',bumper_rear:'後バンパー',side_left:'左側面',side_right:'右側面',tire_FL:'タイヤ FL',tire_FR:'タイヤ FR',tire_RL:'タイヤ RL',tire_RR:'タイヤ RR'};
    marks.forEach(function(m,i){note_('マーク '+(i+1)+' '+C.markSymbol_(m.type)+' '+(regionLabels[m.region]||m.region),m.memo);});
    C.PRACTICAL_GROUPS.forEach(function(g){g.items.forEach(function(it){it.refs.forEach(function(ref){if(ref.indexOf('rental.')===0)note_(it.label,C.itemAt_(record,ref).memo);});});});
    ['body_look','wiper_washer'].forEach(function(key){var it=record.inspection.sections.exterior.items[key];if(it.status!=='unconfirmed')note_('旧記録 '+(key==='body_look'?'車体外観':'ワイパー・ウォッシャー'),C.STATUS_LABELS[it.status]);});
    (record.interiorMarks||[]).forEach(function(m,i){note_('室内マーク '+(i+1)+' '+C.INTERIOR_TYPES[m.type],m.memo);});
    newCanvas_(); title_();
    var plate=typeof ringFormatFleetPlateDisplay_==='function' ? ringFormatFleetPlateDisplay_(vehicle) : vehicle.plateSuffix;
    var fields=[['車両名',vehicle.displayName||vehicle.nickname||vehicle.vehicleName||'未入力'],['ナンバー',plate||'未登録'],['VIN',vehicle.vin||record.vin||''],['点検日',record.meta.inspectionDate||'未入力'],['点検用途',C.purposeLabel_(record.meta.purpose)],['走行距離',record.meta.odometerKm?record.meta.odometerKm+' km':'未入力'],['燃料残量',C.fuelLabel_(record.meta.fuelLevel)]];
    var y=64,colW=(width-gap)/2;
    for(var fi=0;fi<fields.length;fi+=2){var rowH=0;for(var fj=0;fj<2&&fi+fj<fields.length;fj++){var f=fields[fi+fj],x=margin+fj*(colW+gap);var label=f[0]+'：'+f[1];var ls=lines_(label,colW,10);if(ls.length>2){note_(f[0]+'（全文）',f[1]);label=ls.slice(0,2).join('\n')+'…（追記）';}rowH=Math.max(rowH,text_(label,x,y,colW,10,false));}y+=rowH+4;}
    y+=6;var sectionTop=y;

    // Two diagrams above the compact two-column checklist. Labels may grow, coordinates do not.
    var diagramHeight=Math.max(160,218-Math.max(0,sectionTop-142)),diagCol=(width-gap)/2;
    async function drawDiagram_(bytes,x,title,legend) {
      var top=heading_(title,x,sectionTop,diagCol);
      if(bytes.length){var bin='';for(var di=0;di<bytes.length;di++)bin+=String.fromCharCode(bytes[di]);var img=await image_('data:image/png;base64,'+btoa(bin));fitImage_(img,x,top,diagCol,diagramHeight,'diagram');}
      return top+diagramHeight+text_(legend,x,top+diagramHeight+3,diagCol,9.5,true)+7;
    }
    var diagramsEnd=Math.max(await drawDiagram_(diagramBytes,margin,'外装','● 傷  × へこみ  □ その他'),await drawDiagram_(insideBytes,margin+diagCol+gap,'室内（一般的な配置）','△ 汚れ  # 破れ  ○ 傷'));
    var ys=[diagramsEnd+4,diagramsEnd+4];
    function compactGroup_(group,column) {
      var gx=margin+column*(diagCol+gap),gy=ys[column];
      fill_(gx,gy,diagCol,18,blue);text_(group.title,gx+6,gy+2,diagCol-12,10,true,navy);gy+=19;
      group.items.forEach(function(it,i){
        var st=C.groupedStatus_(record,it.refs),labelW=diagCol-55;
        var rh=Math.max(15,lines_(it.label,labelW-9,9.5).length*13.3+1.7);
        if(i%2===0)fill_(gx,gy,diagCol,rh,'#f5f7fa');
        text_(it.label,gx+5,gy+1,labelW-9,9.5,false);
        text_((st==='good'?'✓ ':st==='unconfirmed'?'□ ':'')+(C.STATUS_LABELS[st]||'未確認'),gx+labelW,gy+1,55,9.5,st==='check',st==='check'?'#9a460b':ink);
        gy+=rh;
        if(it.refs.length>1 && it.refs[0].indexOf('tire.')!==0){var vals=it.refs.map(function(ref){return C.itemAt_(record,ref).status;});if(new Set(vals).size>1)it.refs.forEach(function(ref){var a=ref.split('.'),old=C.INSPECTION_SECTIONS.find(function(g){return g.id===a[0];}),f=old&&old.items.find(function(v){return v.key===a[1];});note_(it.label+' / '+(f?f.label:ref),C.STATUS_LABELS[C.itemAt_(record,ref).status]);});}
      });ys[column]=gy+3;
    }
    C.PRACTICAL_GROUPS.forEach(function(g,i){compactGroup_(g,i<3||i===5?0:1);});
    compactGroup_({title:'タイヤ',items:[{label:'タイヤ4輪',refs:C.tireRefs_()}]},1);
    ys[1]+=text_('空気圧・摩耗・傷・異物・その他異常',margin+diagCol+gap,ys[1],diagCol,8.5,false,grey)+4;
    // Keep per-wheel differing results and measured values, never replace them with the group status.
    C.TIRE_WHEELS.forEach(function(w){var t=record.inspection.tires[w],vals=C.TIRE_CHECKS.map(function(it){return t.items[it.key].status;});
      if(new Set(C.tireRefs_().map(function(ref){return C.itemAt_(record,ref).status;})).size>1)
        note_('タイヤ '+w,C.TIRE_CHECKS.map(function(it){return it.label+' '+C.STATUS_LABELS[t.items[it.key].status];}).join(' / '));
      if(t.pressureValue)note_('空気圧 '+w,t.pressureValue+' '+t.pressureUnit);
    });
    var issued=C.OPTION_FIELDS.filter(function(o){return record.rentalOptions[o.id].issued;});
    var extra=['貸出備品：'+(issued.length?issued.map(function(o){var v=record.rentalOptions[o.id];return o.label+'（'+(v.returned?'返却済':'返却未確認')+'）';}).join('、'):'なし'),
      'お客様への説明：'+(record.customerExplained?'確認済み':'未確認')];
    C.OPTION_FIELDS.forEach(function(o){var v=record.rentalOptions[o.id];if(v.issued)note_(o.label+' 備品メモ',v.note);});
    C.GUIDANCE_FIELDS.forEach(function(g){if(record.customerGuidance[g.id])extra.push(g.label+'：'+record.customerGuidance[g.id]);});
    var extraX=margin+diagCol+gap;
    var ey=heading_('備品・お客様への確認',extraX,ys[1],diagCol);
    extra.forEach(function(line){
      var h=lines_(line,diagCol-12,9.5).length*13.3;
      if(ey+h<=Math.max(ys[1],740)){text_(line,extraX+6,ey,diagCol-12,9.5,false);ey+=h+3;}
      else notes.push(line);
    });
    y=Math.max(ey,ys[0])+5;

    // Notes overflow after the optional photo page. Nothing is silently cropped.
    var noteLines=[];notes.forEach(function(n){lines_(n,width-12,9.5).forEach(function(l){noteLines.push(l);});});
    var notePos=0;y=heading_('共通メモ・記録',margin,y,width);
    var recordFooter='記録ID：'+String(record.recordId||'');
    var available=Math.max(0,Math.floor((A4H-51-y)/13.3));
    if(noteLines.length>available)available=Math.max(0,available-1);
    if(!noteLines.length)text_('メモなし',margin+6,y,width-12,9.5,false,grey);
    while(notePos<noteLines.length&&notePos<available){text_(noteLines[notePos++],margin+6,y,width-12,9.5,false,undefined,'note');y+=13.3;}
    if(notePos<noteLines.length)text_('続きは追記ページに掲載',margin+6,y,width-12,9.5,true,grey);
    text_(recordFooter,margin,A4H-42,width,8,false,grey);
    if(photos.length){newCanvas_();title_('写真 ／ '+(vehicle.vin||record.vin||''));var rows=Math.ceil(photos.length/2),cols=photos.length===1?1:2,cellW=(width-gap*(cols-1))/cols,cellH=(A4H-116-gap*(rows-1))/rows;
      for(var pi=0;pi<photos.length;pi++){var ph=photos[pi],img=await image_(ph.dataUrl),px=margin+(pi%cols)*(cellW+gap),py=88+Math.floor(pi/cols)*(cellH+gap);var caption=String(ph.caption||ph.description||ph.memo||'');var cap=caption?lines_(caption,cellW,9.5):[];var short=cap.slice(0,2);if(cap.length>2){notes.push('写真 '+(pi+1)+'：'+caption);noteLines.push.apply(noteLines,lines_('写真 '+(pi+1)+'：'+caption,width-12,9.5));short[1]+='…';}var label='写真 '+(pi+1)+(short.length?'  '+short.join('\n'):'');var captionH=lines_(label,cellW,9.5).length*13.3+6;fitImage_(img,px,py,cellW,cellH-captionH,'photo');text_(label,px,py+cellH-captionH+3,cellW,9.5,false);}
    }
    while(notePos<noteLines.length){newCanvas_();title_('共通メモ・過去の個別メモ（続き）');y=90;while(notePos<noteLines.length&&y+13.3<A4H-40){text_(noteLines[notePos++],margin+6,y,width-12,9.5,false,undefined,'note');y+=13.3;}}
    for(var p=0;p<pageCanvases.length;p++){canvas=pageCanvases[p];ctx=canvas.getContext('2d');font_(9,false);ctx.fillStyle=grey;ctx.fillText((p+1)+' / '+pageCanvases.length,A4W-60,A4H-21);var imgPng=await pdfDoc.embedPng(dataUrlToUint8_(canvas.toDataURL('image/png')));var page=pdfDoc.addPage([A4W,A4H]);page.drawImage(imgPng,{x:0,y:0,width:A4W,height:A4H});}
    var pages=pdfDoc.getPages();
    return {bytes:await pdfDoc.save(),fileName:'貸出返却_チェックシート_'+String(record.meta.inspectionDate||'').replace(/[^0-9]/g,'')+'.pdf',pageCount:pages.length,layout:layouts,markPositions:positions,interiorMarkPositions:insidePositions};
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
