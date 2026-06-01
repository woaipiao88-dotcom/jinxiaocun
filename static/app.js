(function () {
  var state = {
    active: "home",
    tabs: ["home"],
    products: [],
    customers: [],
    suppliers: [],
    warehouses: [],
    inventory: [],
    docRows: [{ product_id: "", quantity: "", sub_quantity: "", unit_price: "", remark: "" }]
  };

  var titles = {
    home: "\u9996\u9875",
    purchase_in: "\u91c7\u8d2d\u5165\u5e93",
    purchase_return: "\u91c7\u8d2d\u9000\u8d27",
    sale_out: "\u9500\u552e\u51fa\u5e93",
    sale_return: "\u9500\u552e\u9000\u8d27",
    inventory: "\u5e93\u5b58\u67e5\u8be2",
    products: "\u5546\u54c1\u8d44\u6599",
    customers: "\u5ba2\u6237\u8d44\u6599",
    suppliers: "\u4f9b\u5e94\u5546\u8d44\u6599",
    history: "\u4e1a\u52a1\u5386\u53f2",
    operations: "\u7ecf\u8425\u5386\u7a0b",
    movements: "\u5e93\u5b58\u6d41\u6c34",
    assistant: "\u6570\u636e\u52a9\u624b",
    backup: "\u6570\u636e\u5907\u4efd",
    template: "\u6253\u5370\u6a21\u677f"
  };

  function $(id) { return document.getElementById(id); }

  function htmlEscape(s) {
    s = s === null || s === undefined ? "" : String(s);
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function fmt(n) {
    n = Number(n || 0);
    return n.toFixed(2);
  }

  function fmtQty(n) {
    n = Number(n || 0);
    if (Math.abs(n - Math.round(n)) < 0.000001) return String(Math.round(n));
    return n.toFixed(2);
  }

  function setStatus(text) {
    $("status").innerHTML = htmlEscape(text);
  }

  function toast(text) {
    var el = $("toast");
    el.innerHTML = htmlEscape(text);
    el.style.display = "block";
    window.setTimeout(function () { el.style.display = "none"; }, 2600);
    setStatus(text);
  }

  function api(method, url, data, ok, fail) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var json = null;
      try { json = JSON.parse(xhr.responseText || "{}"); } catch (e) { json = {}; }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (ok) ok(json);
      } else {
        var msg = json.error || ("请求失败：" + xhr.status);
        toast(msg);
        if (fail) fail(msg);
      }
    };
    xhr.send(data ? JSON.stringify(data) : null);
  }

  function get(url, ok) { api("GET", url, null, ok); }
  function post(url, data, ok) { api("POST", url, data, ok); }
  function put(url, data, ok) { api("PUT", url, data, ok); }
  function del(url, ok) { api("DELETE", url, null, ok); }

  function optionList(list, selected, emptyText) {
    var out = emptyText ? '<option value="">' + htmlEscape(emptyText) + '</option>' : "";
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var sel = String(item.id) === String(selected) ? " selected" : "";
      out += '<option value="' + item.id + '"' + sel + '>' + htmlEscape((item.code ? item.code + " " : "") + item.name) + '</option>';
    }
    return out;
  }

  function productOptions(selected) {
    var out = '<option value="">请选择商品</option>';
    for (var i = 0; i < state.products.length; i++) {
      var p = state.products[i];
      var sel = String(p.id) === String(selected) ? " selected" : "";
      out += '<option value="' + p.id + '"' + sel + '>' + htmlEscape(p.code) + '</option>';
    }
    return out;
  }

  function productByCode(code) {
    code = String(code || "").trim().toLowerCase();
    for (var i = 0; i < state.products.length; i++) {
      if (String(state.products[i].code || "").trim().toLowerCase() === code) return state.products[i];
    }
    return null;
  }

  function findById(list, id) {
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return null;
  }

  function openView(name) {
    if (state.tabs.indexOf(name) < 0) state.tabs.push(name);
    state.active = name;
    renderTabs();
    render();
  }
  window.openView = openView;

  function renderTabs() {
    var html = "";
    for (var i = 0; i < state.tabs.length; i++) {
      var t = state.tabs[i];
      html += '<div class="tab ' + (t === state.active ? "active" : "") + '" onclick="openView(\'' + t + '\')">' + htmlEscape(titles[t] || t) + '</div>';
    }
    $("tabs").innerHTML = html;
  }

  function render() {
    if (state.active === "home") return renderHome();
    if (state.active === "products") return renderProducts();
    if (state.active === "customers") return renderPartners("customer");
    if (state.active === "suppliers") return renderPartners("supplier");
    if (state.active === "inventory") return renderInventory();
    if (state.active === "history") return renderHistory();
    if (state.active === "operations") return renderOperations();
    if (state.active === "movements") return renderMovements();
    if (state.active === "assistant") return renderAssistant();
    if (state.active === "backup") return renderBackup();
    if (state.active === "template") return renderTemplateEditor();
    if (state.active === "purchase_in" || state.active === "purchase_return" || state.active === "sale_out" || state.active === "sale_return") {
      return renderDocument(state.active);
    }
  }

  function renderHome() {
    $("view").innerHTML =
      '<div class="panel"><div class="panel-title">常用功能</div><div class="panel-body">' +
      '<div class="home-grid">' +
      card("销售出库", "开销售单并扣减库存", "sale_out") +
      card("销售退货", "客户退货并增加库存", "sale_return") +
      card("采购入库", "进货入库并计算成本", "purchase_in") +
      card("采购退货", "退给供应商并扣减库存", "purchase_return") +
      card("库存查询", "库存、成本、库存金额", "inventory") +
      card("业务历史", "查单、打印、作废", "history") +
      card("经营历程", "每一次保存和作废", "operations") +
      card("库存流水", "每一次库存变化", "movements") +
      card("数据助手", "统一搜索、归类、AI接口", "assistant") +
      card("数据备份", "复制数据库备份文件", "backup") +
      '</div></div></div>' +
      '<div class="panel"><div class="panel-title">当前版本</div><div class="panel-body muted">' +
      'V2 第一版已重做底层库存流程。销售出库扣库存，销售退货加库存；采购入库加库存，采购退货扣库存；作废单据会自动反向冲回。' +
      '</div></div>';
  }

  function card(title, text, view) {
    return '<div class="home-card" onclick="openView(\'' + view + '\')"><b>' + title + '</b><span>' + text + '</span></div>';
  }

  function renderProducts() {
    get("/api/products", function (list) {
      state.products = list;
      var rows = "";
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        rows += '<tr><td>' + htmlEscape(p.code) + '</td><td>' + htmlEscape(p.name) + '</td><td>' + htmlEscape(p.category) + '</td><td>' + htmlEscape(p.spec) + '</td><td>' + htmlEscape(p.unit) + '</td><td class="num">' + fmt(p.cost_price) + '</td><td class="num">' + fmt(p.sale_price) + '</td><td class="num">' + fmt(p.min_stock) + '</td><td><button class="small" onclick="editProduct(' + p.id + ')">修改</button> <button class="small danger" onclick="deleteProduct(' + p.id + ')">删除</button></td></tr>';
      }
      $("view").innerHTML =
        '<div class="panel"><div class="panel-title">商品资料</div><div class="panel-body">' +
        '<div class="toolbar"><button class="primary" onclick="newProduct()">新增商品</button><button onclick="loadAll()">刷新</button></div>' +
        '<table data-key="products"><thead><tr><th>编号</th><th>名称</th><th>分类</th><th>规格</th><th>单位</th><th>成本价</th><th>销售价</th><th>下限</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '</div></div>';
      applyColumnMemory();
    });
  }

  window.newProduct = function () { productForm({ id: 0, code: "", name: "", category: "", spec: "", unit: "件", cost_price: 0, sale_price: 0, min_stock: 0, remark: "" }); };
  window.editProduct = function (id) { productForm(findById(state.products, id)); };
  window.deleteProduct = function (id) { if (confirm("确定删除这个商品？有业务记录时会停用而不是硬删除。")) del("/api/products/" + id, function () { toast("商品已删除/停用"); renderProducts(); }); };

  function productForm(p) {
    $("view").innerHTML =
      '<div class="panel"><div class="panel-title">' + (p.id ? "修改商品" : "新增商品") + '</div><div class="panel-body">' +
      '<div class="form-grid">' +
      input("编号", "p_code", p.code) + input("名称", "p_name", p.name) + input("分类", "p_category", p.category) + input("规格", "p_spec", p.spec) +
      input("单位", "p_unit", p.unit) + input("成本价", "p_cost", p.cost_price) + input("销售价", "p_sale", p.sale_price) + input("库存下限", "p_min", p.min_stock) +
      '</div><p><label>备注</label><textarea id="p_remark">' + htmlEscape(p.remark || "") + '</textarea></p>' +
      '<button class="primary" onclick="saveProduct(' + p.id + ')">保存</button> <button onclick="renderProducts()">返回</button>' +
      '</div></div>';
  }

  window.saveProduct = function (id) {
    var data = {
      code: $("p_code").value, name: $("p_name").value, category: $("p_category").value, spec: $("p_spec").value,
      unit: $("p_unit").value, sub_unit: "", conversion_ratio: 1, cost_price: Number($("p_cost").value || 0),
      sale_price: Number($("p_sale").value || 0), min_stock: Number($("p_min").value || 0), remark: $("p_remark").value
    };
    if (!data.code || !data.name) return toast("编号和名称不能为空");
    (id ? put("/api/products/" + id, data, after) : post("/api/products", data, after));
    function after() { toast("商品已保存"); loadAll(function () { openView("products"); }); }
  };

  function renderPartners(kind) {
    var url = "/api/partners/" + kind;
    get(url, function (list) {
      if (kind === "customer") state.customers = list; else state.suppliers = list;
      var rows = "";
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        rows += '<tr><td>' + htmlEscape(p.code) + '</td><td>' + htmlEscape(p.name) + '</td><td>' + htmlEscape(p.contact) + '</td><td>' + htmlEscape(p.phone) + '</td><td>' + htmlEscape(p.address) + '</td><td><button class="small" onclick="editPartner(\'' + kind + '\',' + p.id + ')">修改</button> <button class="small danger" onclick="deletePartner(\'' + kind + '\',' + p.id + ')">删除</button></td></tr>';
      }
      $("view").innerHTML =
        '<div class="panel"><div class="panel-title">' + (kind === "customer" ? "客户资料" : "供应商资料") + '</div><div class="panel-body">' +
        '<div class="toolbar"><button class="primary" onclick="newPartner(\'' + kind + '\')">新增</button><button onclick="loadAll()">刷新</button></div>' +
        '<table data-key="' + kind + '"><thead><tr><th>编号</th><th>名称</th><th>联系人</th><th>电话</th><th>地址</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '</div></div>';
      applyColumnMemory();
    });
  }

  window.newPartner = function (kind) { partnerForm(kind, { id: 0, code: "", name: "", contact: "", phone: "", address: "", remark: "" }); };
  window.editPartner = function (kind, id) { partnerForm(kind, findById(kind === "customer" ? state.customers : state.suppliers, id)); };
  window.deletePartner = function (kind, id) { if (confirm("确定删除？有业务记录时会停用。")) del("/api/partners/" + kind + "/" + id, function () { toast("已删除/停用"); renderPartners(kind); }); };

  function partnerForm(kind, p) {
    $("view").innerHTML =
      '<div class="panel"><div class="panel-title">' + (p.id ? "修改" : "新增") + (kind === "customer" ? "客户" : "供应商") + '</div><div class="panel-body">' +
      '<div class="form-grid">' + input("编号", "x_code", p.code) + input("名称", "x_name", p.name) + input("联系人", "x_contact", p.contact) + input("电话", "x_phone", p.phone) + input("地址", "x_address", p.address) + '</div>' +
      '<p><label>备注</label><textarea id="x_remark">' + htmlEscape(p.remark || "") + '</textarea></p>' +
      '<button class="primary" onclick="savePartner(\'' + kind + '\',' + p.id + ')">保存</button> <button onclick="renderPartners(\'' + kind + '\')">返回</button>' +
      '</div></div>';
  }

  window.savePartner = function (kind, id) {
    var data = { code: $("x_code").value, name: $("x_name").value, contact: $("x_contact").value, phone: $("x_phone").value, address: $("x_address").value, remark: $("x_remark").value };
    if (!data.name) return toast("名称不能为空");
    (id ? put("/api/partners/" + kind + "/" + id, data, after) : post("/api/partners/" + kind, data, after));
    function after() { toast("资料已保存"); loadAll(function () { openView(kind === "customer" ? "customers" : "suppliers"); }); }
  };

  function renderDocument(docType) {
    var isSale = docType === "sale_out" || docType === "sale_return";
    var partnerList = isSale ? state.customers : state.suppliers;
    var partnerLabel = isSale ? "客户" : "供应商";
    var payLabel = isSale ? "已收款" : "已付款";
    var title = titles[docType];
    var rows = "";
    ensureTrailingDocRow();
    for (var i = 0; i < state.docRows.length; i++) rows += docRowHtml(i, state.docRows[i]);
    $("view").innerHTML =
      '<div class="panel"><div class="panel-title">' + title + '</div><div class="panel-body">' +
      '<div class="toolbar">' +
      '<button onclick="openView(\'' + (isSale ? "sale_out" : "purchase_in") + '\')">' + (isSale ? "销售出库" : "采购入库") + '</button>' +
      '<button onclick="openView(\'' + (isSale ? "sale_return" : "purchase_return") + '\')">' + (isSale ? "销售退货" : "采购退货") + '</button>' +
      '</div>' +
      '<div class="form-grid">' +
      '<label>' + partnerLabel + '</label><select id="doc_partner">' + optionList(partnerList, "", "请选择") + '</select>' +
      '<label>仓库</label><select id="doc_warehouse">' + optionList(state.warehouses, 1, "") + '</select>' +
      input("经手人", "doc_operator", "") +
      input("部门", "doc_department", "") +
      input("折扣%", "doc_discount", "0") +
      input(payLabel, "doc_paid", "0") +
      input("备注", "doc_remark", "") +
      '</div></div></div>' +
      '<div class="panel"><div class="panel-title">商品明细</div><div class="panel-body">' +
      '<div class="toolbar"><button onclick="clearDocRows()">清空</button><span class="muted">填完一行后自动新增下一行</span></div>' +
      '<div class="sheet-wrap"><table class="sheet" data-key="doc_items"><thead><tr>' +
      '<th style="width:42px">行号</th><th style="width:112px">商品编号</th><th style="width:140px">商品全名</th><th style="width:112px">规格</th><th style="width:76px">单位</th><th style="width:92px">数量</th><th style="width:86px">副单位数量</th><th style="width:112px">单价</th><th style="width:112px">金额</th><th style="width:170px">单据备注</th>' +
      '</tr></thead><tbody id="doc_body">' + rows + '</tbody><tfoot><tr><td class="total-label">合计</td><td></td><td></td><td></td><td></td><td id="doc_qty_total" class="amount-cell">0.00</td><td id="doc_sub_total" class="amount-cell">0.00</td><td></td><td id="doc_total" class="amount-cell">0.00</td><td></td></tr></tfoot></table></div>' +
      '<div class="toolbar" style="justify-content:flex-end;margin-top:8px"><button class="primary" onclick="saveDocument(\'' + docType + '\')">保存过账</button> <button onclick="printCurrentDoc()">打印预览</button></div>' +
      '</div></div>';
    recalcDoc();
    initSheetResize();
    applyColumnMemory();
  }

  function initSheetResize() {
    var table = document.querySelector ? document.querySelector("table.sheet") : null;
    if (!table) return;
    var ths = table.getElementsByTagName("th");
    var defaults = [42, 112, 140, 112, 76, 92, 86, 112, 112, 170];
    var widths = defaults.slice(0);
    try {
      var saved = JSON.parse(localStorage.getItem("jxc_sheet_widths") || "[]");
      for (var i = 0; i < widths.length; i++) if (saved[i]) widths[i] = saved[i];
    } catch (e) {}

    var old = table.getElementsByTagName("colgroup")[0];
    if (old) table.removeChild(old);
    var cg = document.createElement("colgroup");
    var totalWidth = 0;
    for (var c = 0; c < ths.length; c++) {
      var col = document.createElement("col");
      col.setAttribute("data-sheet-col", c);
      col.style.width = (widths[c] || 80) + "px";
      totalWidth += widths[c] || 80;
      cg.appendChild(col);
      ths[c].style.width = "";
      if (!ths[c].getAttribute("data-resize-ready")) {
        ths[c].setAttribute("data-resize-ready", "1");
        var handle = document.createElement("span");
        handle.className = "col-resizer";
        handle.setAttribute("data-col", c);
        handle.onmousedown = function (event) {
          return startSheetResize(event || window.event, Number(this.getAttribute("data-col")));
        };
        ths[c].appendChild(handle);
      }
    }
    table.style.width = totalWidth + "px";
    table.insertBefore(cg, table.firstChild);
  }

  window.startSheetResize = function (event, colIndex) {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    var table = document.querySelector ? document.querySelector("table.sheet") : null;
    if (!table) return false;
    var col = document.querySelector ? document.querySelector('[data-sheet-col="' + colIndex + '"]') : null;
    if (!col) return false;
    var widths = [];
    var cols = table.getElementsByTagName("col");
    for (var i = 0; i < cols.length; i++) widths[i] = parseInt(cols[i].style.width, 10) || cols[i].offsetWidth || 80;
    var startX = event.clientX;
    var startWidth = widths[colIndex];
    document.onmousemove = function (moveEvent) {
      moveEvent = moveEvent || window.event;
      var next = Math.max(36, startWidth + moveEvent.clientX - startX);
      widths[colIndex] = next;
      col.style.width = next + "px";
      var total = 0;
      for (var w = 0; w < widths.length; w++) total += widths[w] || 0;
      table.style.width = total + "px";
    };
    document.onmouseup = function () {
      document.onmousemove = null;
      document.onmouseup = null;
      try { localStorage.setItem("jxc_sheet_widths", JSON.stringify(widths)); } catch (e) {}
    };
    return false;
  };

  function docRowHtml(i, r) {
    var p = findById(state.products, r.product_id) || {};
    return '<tr>' +
      '<td class="row-no">' + (i + 1) + '</td>' +
      '<td><input data-row-product="' + i + '" value="' + htmlEscape(r.product_code || p.code || "") + '" onkeydown="return docCodeKey(event,' + i + ')" onchange="changeDocCode(' + i + ',this.value,false)"></td>' +
      '<td class="readonly-cell">' + htmlEscape(p.name || "") + '</td>' +
      '<td class="readonly-cell">' + htmlEscape(p.spec || "") + '</td>' +
      '<td class="readonly-cell">' + htmlEscape(p.unit || "") + '</td>' +
      '<td><input data-row-qty="' + i + '" class="num" value="' + htmlEscape(r.quantity) + '" oninput="changeDocField(' + i + ',\'quantity\',this.value,true)" onkeydown="return docCellKey(event,' + i + ',\'sub_quantity\')" onchange="changeDocField(' + i + ',\'quantity\',this.value)"></td>' +
      '<td><input data-row-sub_quantity="' + i + '" class="num" value="' + htmlEscape(r.sub_quantity || "") + '" oninput="changeDocField(' + i + ',\'sub_quantity\',this.value,true)" onkeydown="return docCellKey(event,' + i + ',\'unit_price\')" onchange="changeDocField(' + i + ',\'sub_quantity\',this.value)"></td>' +
      '<td><input data-row-unit_price="' + i + '" class="num" value="' + htmlEscape(r.unit_price) + '" oninput="changeDocField(' + i + ',\'unit_price\',this.value,true)" onkeydown="return docCellKey(event,' + i + ',\'remark\')" onchange="changeDocField(' + i + ',\'unit_price\',this.value)"></td>' +
      '<td data-row-amount="' + i + '" class="amount-cell">' + fmt((Number(r.quantity || 0) * Number(r.unit_price || 0))) + '</td>' +
      '<td><input data-row-remark="' + i + '" value="' + htmlEscape(r.remark || "") + '" onkeydown="return docRemarkKey(event,' + i + ')" onchange="changeDocField(' + i + ',\'remark\',this.value)"></td>' +
      '</tr>';
  }

  function ensureTrailingDocRow() {
    if (!state.docRows.length || rowHasValue(state.docRows[state.docRows.length - 1])) {
      state.docRows.push({ product_id: "", quantity: "", sub_quantity: "", unit_price: "", remark: "" });
    }
    while (state.docRows.length < 8) {
      state.docRows.push({ product_id: "", quantity: "", sub_quantity: "", unit_price: "", remark: "" });
    }
  }

  function rowHasValue(r) {
    return !!(r && (r.product_id || Number(r.quantity || 0) || Number(r.sub_quantity || 0) || Number(r.unit_price || 0) || r.remark));
  }

  function rowComplete(r) {
    return !!(r && r.product_id && Number(r.quantity || 0) > 0 && Number(r.unit_price || 0) >= 0);
  }

  function focusDocRow(i) {
    window.setTimeout(function () {
      var el = document.querySelector ? document.querySelector('[data-row-product="' + i + '"]') : null;
      if (el) el.focus();
    }, 30);
  }

  function focusDocCell(i, field) {
    window.setTimeout(function () {
      var el = document.querySelector ? document.querySelector('[data-row-' + field + '="' + i + '"]') : null;
      if (el) {
        el.focus();
        if (el.select) el.select();
      }
    }, 30);
  }

  function inventoryFor(productId) {
    for (var i = 0; i < state.inventory.length; i++) {
      if (String(state.inventory[i].product_id) === String(productId)) return state.inventory[i].quantity;
    }
    return 0;
  }

  window.changeDocProduct = function (i, id) {
    var p = findById(state.products, id);
    state.docRows[i].product_id = id;
    state.docRows[i].product_code = p ? p.code : "";
    state.docRows[i].unit_price = p ? (state.active.indexOf("sale") === 0 ? p.sale_price : p.cost_price) : 0;
    var shouldMove = rowComplete(state.docRows[i]) && i === state.docRows.length - 1;
    ensureTrailingDocRow();
    renderDocument(state.active);
    if (shouldMove) focusDocRow(i + 1);
  };
  window.docCodeKey = function (event, i) {
    event = event || window.event;
    var key = event.key || event.keyCode;
    if (key === "Enter" || key === 13) {
      if (event.preventDefault) event.preventDefault();
      var el = event.target || event.srcElement;
      changeDocCode(i, el ? el.value : "", true);
      return false;
    }
    return true;
  };
  window.changeDocCode = function (i, code, fromEnter) {
    var p = productByCode(code);
    if (!p) {
      state.docRows[i].product_id = "";
      state.docRows[i].product_code = code;
      if (fromEnter && code) toast("找不到商品编号：" + code);
      recalcDoc();
      return;
    }
    state.docRows[i].product_id = p.id;
    state.docRows[i].product_code = p.code;
    state.docRows[i].unit_price = state.active.indexOf("sale") === 0 ? p.sale_price : p.cost_price;
    ensureTrailingDocRow();
    renderDocument(state.active);
    focusDocCell(i, "qty");
  };
  window.docCellKey = function (event, i, nextField) {
    event = event || window.event;
    var key = event.key || event.keyCode;
    if (key === "Enter" || key === 13) {
      if (event.preventDefault) event.preventDefault();
      var el = event.target || event.srcElement;
      if (el && el.onchange) el.onchange();
      focusDocCell(i, nextField);
      return false;
    }
    return true;
  };
  window.docRemarkKey = function (event, i) {
    event = event || window.event;
    var key = event.key || event.keyCode;
    if (key === "Enter" || key === 13) {
      if (event.preventDefault) event.preventDefault();
      var el = event.target || event.srcElement;
      if (el && el.onchange) el.onchange();
      ensureTrailingDocRow();
      renderDocument(state.active);
      focusDocRow(i + 1);
      return false;
    }
    return true;
  };
  window.changeDocField = function (i, field, value, live) {
    state.docRows[i][field] = field === "remark" ? value : Number(value || 0);
    updateDocRowAmount(i);
    if (live) {
      recalcDoc();
      return;
    }
    var shouldMove = rowComplete(state.docRows[i]) && i === state.docRows.length - 1;
    if (shouldMove) {
      ensureTrailingDocRow();
      renderDocument(state.active);
      focusDocRow(i + 1);
      return;
    }
    recalcDoc();
  };
  window.clearDocRows = function () { state.docRows = [{ product_id: "", quantity: "", sub_quantity: "", unit_price: "", remark: "" }]; renderDocument(state.active); };

  function updateDocRowAmount(i) {
    var el = document.querySelector ? document.querySelector('[data-row-amount="' + i + '"]') : null;
    if (el) el.innerHTML = fmt(Number(state.docRows[i].quantity || 0) * Number(state.docRows[i].unit_price || 0));
  }

  function recalcDoc() {
    var total = 0, qtyTotal = 0, subTotal = 0;
    for (var i = 0; i < state.docRows.length; i++) {
      qtyTotal += Number(state.docRows[i].quantity || 0);
      subTotal += Number(state.docRows[i].sub_quantity || 0);
      total += Number(state.docRows[i].quantity || 0) * Number(state.docRows[i].unit_price || 0);
    }
    var qtyEl = $("doc_qty_total");
    var subEl = $("doc_sub_total");
    var el = $("doc_total");
    if (qtyEl) qtyEl.innerHTML = fmt(qtyTotal);
    if (subEl) subEl.innerHTML = fmt(subTotal);
    if (el) el.innerHTML = fmt(total);
  }

  window.saveDocument = function (docType) {
    var items = [];
    for (var i = 0; i < state.docRows.length; i++) {
      var r = state.docRows[i];
      if (r.product_id && Number(r.quantity) > 0) items.push({ product_id: Number(r.product_id), quantity: Number(r.quantity), sub_quantity: Number(r.sub_quantity || 0), unit_price: Number(r.unit_price || 0), remark: r.remark || "" });
    }
    var data = {
      doc_type: docType,
      partner_id: Number($("doc_partner").value || 0) || null,
      warehouse_id: Number($("doc_warehouse").value || 1),
      operator: $("doc_operator").value,
      department: $("doc_department").value,
      discount_rate: Number($("doc_discount").value || 0),
      paid_amount: Number($("doc_paid").value || 0),
      remark: $("doc_remark").value,
      items: items
    };
    post("/api/documents", data, function (doc) {
      toast("\u4fdd\u5b58\u8fc7\u8d26\u5b8c\u6bd5\uff0c\u5355\u53f7\uff1a" + doc.doc_no);
      state.docRows = [{ product_id: "", quantity: "", sub_quantity: "", unit_price: "", remark: "" }];
      loadAll(function () {
        openView("history");
        if (docType === "sale_out" || docType === "sale_return") showPrintPrompt(doc);
      });
    });
  };

  window.printCurrentDoc = function () { window.print(); };

  function showPrintPrompt(doc) {
    var old = $("print_prompt");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var mask = document.createElement("div");
    mask.id = "print_prompt";
    mask.style.cssText = "position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.28);z-index:9999;display:flex;align-items:center;justify-content:center;";
    mask.innerHTML = '<div style="background:#fff;border:1px solid #6f8fb8;box-shadow:0 8px 24px rgba(0,0,0,.25);padding:18px 22px;min-width:320px;text-align:center;">' +
      '<div style="font-size:18px;font-weight:bold;margin-bottom:8px;">\u4fdd\u5b58\u8fc7\u8d26\u5b8c\u6bd5</div>' +
      '<div style="margin-bottom:14px;color:#334;">\u5355\u53f7\uff1a' + htmlEscape(doc.doc_no) + '</div>' +
      '<button class="primary" onclick="printDocument(' + doc.id + ')">\u6253\u5370\u9500\u552e\u5355</button> ' +
      '<button onclick="closePrintPrompt()">\u6682\u4e0d\u6253\u5370</button>' +
      '</div>';
    document.body.appendChild(mask);
  }
  window.closePrintPrompt = function () {
    var el = $("print_prompt");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  };

  function renderInventory() {
    get("/api/inventory", function (list) {
      state.inventory = list;
      var total = 0, low = 0, rows = "";
      for (var i = 0; i < list.length; i++) {
        var x = list[i], isLow = Number(x.quantity) < Number(x.min_stock || 0);
        total += Number(x.stock_amount || 0);
        if (isLow) low++;
        rows += '<tr><td>' + htmlEscape(x.product_code) + '</td><td>' + htmlEscape(x.product_name) + '</td><td>' + htmlEscape(x.category) + '</td><td>' + htmlEscape(x.spec) + '</td><td>' + htmlEscape(x.unit) + '</td><td>' + htmlEscape(x.warehouse_name) + '</td><td class="num ' + (isLow ? "low" : "") + '">' + fmt(x.quantity) + '</td><td class="num">' + fmt(x.min_stock) + '</td><td class="num">' + fmt(x.cost_price) + '</td><td class="num">' + fmt(x.stock_amount) + '</td><td>' + (isLow ? '<span class="low">低于下限</span>' : '正常') + '</td></tr>';
      }
      $("view").innerHTML =
        '<div class="panel"><div class="panel-title">库存查询</div><div class="panel-body">' +
        '<div class="toolbar"><button onclick="loadAll()">刷新</button><span class="badge">商品 ' + list.length + ' 行</span><span class="badge">库存总值 ' + fmt(total) + '</span><span class="badge">预警 ' + low + '</span></div>' +
        '<table data-key="inventory"><thead><tr><th>编号</th><th>名称</th><th>分类</th><th>规格</th><th>单位</th><th>仓库</th><th>库存</th><th>下限</th><th>成本价</th><th>库存金额</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '</div></div>';
      applyColumnMemory();
    });
  }

  function renderHistory() {
    get("/api/documents", function (list) {
      var rows = "";
      for (var i = 0; i < list.length; i++) {
        var d = list[i], cls = d.status === "voided" ? "voided" : "";
        rows += '<tr class="' + cls + '"><td>' + htmlEscape(d.doc_no) + '</td><td>' + htmlEscape(titles[d.doc_type] || d.doc_type) + '</td><td>' + htmlEscape(d.partner_name || "") + '</td><td>' + htmlEscape(d.warehouse_name || "") + '</td><td class="num">' + fmt(d.total_amount) + '</td><td class="num">' + fmt(d.paid_amount) + '</td><td class="num">' + fmt(d.balance_amount) + '</td><td>' + htmlEscape(d.operator) + '</td><td>' + htmlEscape(d.status === "voided" ? "\u5df2\u4f5c\u5e9f" : "\u5df2\u8fc7\u8d26") + '</td><td>' + htmlEscape(d.created_at) + '</td><td><button class="small" onclick="showDocument(' + d.id + ')">\u67e5\u770b</button> <button class="small" onclick="printDocument(' + d.id + ')">\u6253\u5370</button> ' + (d.status === "voided" ? "" : '<button class="small danger" onclick="voidDocument(' + d.id + ')">\u4f5c\u5e9f</button>') + '</td></tr>';
      }
      $("view").innerHTML =
        '<div class="panel"><div class="panel-title">\u4e1a\u52a1\u5386\u53f2</div><div class="panel-body">' +
        '<div class="toolbar"><button onclick="loadAll()">\u5237\u65b0</button></div>' +
        '<table data-key="history"><thead><tr><th>\u5355\u53f7</th><th>\u7c7b\u578b</th><th>\u5f80\u6765\u5355\u4f4d</th><th>\u4ed3\u5e93</th><th>\u91d1\u989d</th><th>\u5df2\u6536/\u4ed8</th><th>\u6b20\u6b3e</th><th>\u7ecf\u624b\u4eba</th><th>\u72b6\u6001</th><th>\u65e5\u671f</th><th>\u64cd\u4f5c</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '</div></div>';
      applyColumnMemory();
    });
  }

  window.showDocument = function (id) {
    get("/api/documents/" + id, function (d) {
      var rows = "";
      for (var i = 0; i < d.items.length; i++) {
        var it = d.items[i];
        rows += '<tr><td>' + htmlEscape(it.product_code) + '</td><td>' + htmlEscape(it.product_name) + '</td><td>' + htmlEscape(it.spec) + '</td><td>' + htmlEscape(it.unit) + '</td><td class="num">' + fmt(it.quantity) + '</td><td class="num">' + fmt(it.sub_quantity) + '</td><td class="num">' + fmt(it.unit_price) + '</td><td class="num">' + fmt(it.amount) + '</td><td>' + htmlEscape(it.remark) + '</td></tr>';
      }
      $("view").innerHTML =
        '<div class="panel"><div class="panel-title">\u5355\u636e\u67e5\u770b\uff1a' + htmlEscape(d.doc_no) + '</div><div class="panel-body">' +
        '<div class="toolbar"><button onclick="openView(\'history\')">\u8fd4\u56de\u5386\u53f2</button><button onclick="printDocument(' + d.id + ')">\u6309\u7968\u636e\u683c\u5f0f\u6253\u5370</button></div>' +
        '<div class="form-grid">' +
        labelValue("\u7c7b\u578b", titles[d.doc_type] || d.doc_type) + labelValue("\u5355\u4f4d", d.partner_name || "") + labelValue("\u4ed3\u5e93", d.warehouse_name || "") + labelValue("\u7ecf\u624b\u4eba", d.operator || "") +
        labelValue("\u91d1\u989d", fmt(d.total_amount)) + labelValue("\u5df2\u6536/\u4ed8", fmt(d.paid_amount)) + labelValue("\u6b20\u6b3e", fmt(d.balance_amount)) + labelValue("\u72b6\u6001", d.status === "voided" ? "\u5df2\u4f5c\u5e9f" : "\u5df2\u8fc7\u8d26") +
        '</div></div></div>' +
        '<div class="panel"><div class="panel-title">\u660e\u7ec6</div><div class="panel-body"><table><thead><tr><th>\u7f16\u53f7</th><th>\u5546\u54c1</th><th>\u89c4\u683c</th><th>\u5355\u4f4d</th><th>\u6570\u91cf</th><th>\u526f\u5355\u4f4d\u6570\u91cf</th><th>\u5355\u4ef7</th><th>\u91d1\u989d</th><th>\u5907\u6ce8</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    });
  };

  function cnMoney(n) {
    var fraction = ["\u89d2", "\u5206"], digit = ["\u96f6", "\u58f9", "\u8d30", "\u53c1", "\u8086", "\u4f0d", "\u9646", "\u67d2", "\u634c", "\u7396"];
    var unit = [["\u5143", "\u4e07", "\u4ebf"], ["", "\u62fe", "\u4f70", "\u4edf"]];
    var head = n < 0 ? "\u8d1f" : "";
    n = Math.abs(Number(n || 0));
    var s = "";
    for (var i = 0; i < fraction.length; i++) s += (digit[Math.floor(n * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/\u96f6./, "");
    s = s || "\u6574";
    n = Math.floor(n);
    for (var u = 0; u < unit[0].length && n > 0; u++) {
      var p = "";
      for (var j = 0; j < unit[1].length && n > 0; j++) {
        p = digit[n % 10] + unit[1][j] + p;
        n = Math.floor(n / 10);
      }
      s = p.replace(/(\u96f6.)*\u96f6$/, "").replace(/^$/, "\u96f6") + unit[0][u] + s;
    }
    return head + s.replace(/(\u96f6.)*\u96f6\u5143/, "\u5143").replace(/(\u96f6.)+/g, "\u96f6").replace(/^\u6574$/, "\u96f6\u5143\u6574");
  }

  function renderTemplate(template, d, itemRows, totalQty) {
    var title = d.doc_type === "sale_out" || d.doc_type === "sale_return" ? "\u9500\u552e\u5355" : "\u8fdb\u8d27\u5355";
    var map = {
      title: title,
      page: "\u7b2c 1/1 \u9875",
      doc_no: d.doc_no || "",
      doc_type: titles[d.doc_type] || d.doc_type || "",
      warehouse_name: d.warehouse_name || "\u9ed8\u8ba4\u4ed3\u5e93",
      partner_name: d.partner_name || "",
      customer_name: d.partner_name || "",
      operator: d.operator || "",
      date: (d.created_at || "").slice(0, 10),
      phone: "0536-2355298",
      total_amount: fmt(d.total_amount),
      total_qty: fmt(totalQty),
      amount_upper: cnMoney(d.total_amount),
      items: itemRows
    };
    return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, function (_, key) {
      return key === "items" ? map[key] || "" : htmlEscape(map[key] || "");
    });
  }

  function defaultTicketTemplate() {
    return '<div class="ticket-print">' +
      '<div class="ticket-page">{{page}}</div>' +
      '<div class="ticket-title">{{title}}</div>' +
      '<div class="ticket-top">' +
      '<div>\u53d1\u8d27\u4ed3\u5e93\uff1a{{warehouse_name}}</div>' +
      '<div>\u5ba2\u6237\u540d\u79f0\uff1a{{date}}</div>' +
      '<div>\u5f55\u5355\u65e5\u671f\uff1a{{doc_no}}</div>' +
      '<div>\u7ecf\u624b\u4eba\uff1a{{customer_name}}</div>' +
      '<div>\u5355\u636e\u7f16\u53f7\uff1a{{operator}}</div>' +
      '<div>\u8054\u7cfb\u7535\u8bdd\uff1a{{phone}}</div>' +
      '</div>' +
      '<table class="ticket-table"><thead><tr><th>\u4ef6\u6570</th><th>\u5546\u54c1\u5168\u540d</th><th>\u89c4\u683c</th><th>\u5355\u4f4d</th><th>\u6570\u91cf</th><th>\u5355\u4ef7</th><th>\u91d1\u989d</th><th>\u5907\u6ce8</th></tr></thead><tbody><tr class="template-only"><td></td><td class="ticket-name">\u5546\u54c1\u660e\u7ec6\u81ea\u52a8\u663e\u793a\u5728\u8fd9\u91cc</td><td></td><td></td><td></td><td></td><td></td><td class="ticket-remark">\u4e0d\u8981\u5220\u6389 {{items}}</td></tr>{{items}}' +
      '<tr class="ticket-sum"><td class="ticket-sum-label" colspan="2">\u603b\u8ba1\u5927\u5199</td><td class="ticket-sum-amount" colspan="2">{{amount_upper}}</td><td>{{total_qty}}</td><td>\u9875\u5c0f\u8ba1</td><td>{{total_amount}}</td><td></td></tr>' +
      '</tbody></table>' +
      '<div class="ticket-bottom">\u519c\u4e1a\u94f6\u884c\uff1a\u5f90\u542f\u5174 622848 0298127208171\u3000\u9ad8\u5bc6\u5e02\u65b0\u65b0\u5206\u7406\u5904<br>\u7ecf\u8425\u8303\u56f4\uff1a\u9540\u950c\u65b9\u7ba1\u3001\u6fc0\u5149\u5207\u5272\u3001\u51b7\u677f\u3001\u70ed\u677f\u3001\u6881\u795e\u677f\u3001\u9540\u950c\u677f\u5377\u3001\u5206\u6761\u3001\u526a\u677f\u6298\u5f2f\u3002</div>' +
      '</div>';
  }

  function buildTicketHtml(d, template) {
    var totalQty = 0, itemRows = "";
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i];
      totalQty += Number(it.quantity || 0);
      itemRows += '<tr>' +
        '<td>' + fmtQty(it.sub_quantity) + '</td>' +
        '<td class="ticket-name">' + htmlEscape(it.product_name || "") + '</td>' +
        '<td>' + htmlEscape(it.spec || "") + '</td>' +
        '<td>' + htmlEscape(it.unit || "") + '</td>' +
        '<td>' + fmt(it.quantity) + '</td>' +
        '<td>' + fmt(it.unit_price) + '</td>' +
        '<td>' + fmt(it.amount) + '</td>' +
        '<td class="ticket-remark">' + htmlEscape(it.remark || "") + '</td>' +
        '</tr>';
    }
    return renderTemplate(template || defaultTicketTemplate(), d, itemRows, totalQty);
  }

  function printHtml(html) {
    var host = $("print_host");
    if (!host) {
      host = document.createElement("div");
      host.id = "print_host";
      document.body.appendChild(host);
    }
    host.innerHTML = html;
    if ((" " + document.body.className + " ").indexOf(" printing-ticket ") < 0) document.body.className += " printing-ticket";
    window.setTimeout(function () { window.print(); }, 80);
    window.setTimeout(function () {
      document.body.className = document.body.className.replace(/\bprinting-ticket\b/g, "");
    }, 1200);
  }

  window.printDocument = function (id) {
    get("/api/documents/" + id, function (d) {
      closePrintPrompt();
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/print-template?v=" + new Date().getTime(), true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        var template = xhr.status >= 200 && xhr.status < 300 ? xhr.responseText : defaultTicketTemplate();
        printHtml(buildTicketHtml(d, template));
      };
      xhr.send(null);
    });
  };

  window.voidDocument = function (id) {
    if (!confirm("\u786e\u5b9a\u4f5c\u5e9f\u8fd9\u5f20\u5355\u636e\uff1f\u7cfb\u7edf\u4f1a\u81ea\u52a8\u53cd\u5411\u51b2\u56de\u5e93\u5b58\u3002")) return;
    post("/api/documents/" + id + "/void", {}, function () { toast("\u5355\u636e\u5df2\u4f5c\u5e9f\u5e76\u51b2\u56de\u5e93\u5b58"); loadAll(function () { openView("history"); }); });
  };

  window.deleteDocument = function (id) {
    if (!confirm("\u786e\u5b9a\u5220\u9664\u8fd9\u5f20\u5355\u636e\uff1f\u5982\u679c\u5df2\u8fc7\u8d26\uff0c\u7cfb\u7edf\u4f1a\u5148\u53cd\u5411\u51b2\u56de\u5e93\u5b58\u518d\u5220\u9664\u3002")) return;
    del("/api/documents/" + id, function () {
      toast("\u5355\u636e\u5df2\u5220\u9664");
      loadAll(function () { openView(state.active === "operations" ? "operations" : "history"); });
    });
  };

  function renderOperations() {
    get("/api/operations", function (list) {
      var rows = "";
      for (var i = 0; i < list.length; i++) {
        var x = list[i], cls = x.status === "voided" ? "voided" : "";
        rows += '<tr class="' + cls + '" ondblclick="showDocument(' + x.id + ')"><td>' + htmlEscape(x.created_at) + '</td><td>' + htmlEscape(titles[x.doc_type] || x.doc_type) + '</td><td>' + htmlEscape(x.partner_name || "") + '</td><td class="num">' + fmt(x.total_amount) + '</td><td>' + htmlEscape(x.doc_no || "") + '</td><td>' + htmlEscape(x.status === "voided" ? "\u5df2\u4f5c\u5e9f" : "\u5df2\u8fc7\u8d26") + '</td><td><button class="small" onclick="showDocument(' + x.id + ')">\u67e5\u770b</button> <button class="small" onclick="printDocument(' + x.id + ')">\u6253\u5370</button> <button class="small danger" onclick="deleteDocument(' + x.id + ')">\u5220\u9664</button></td></tr>';
      }
      $("view").innerHTML =
        '<div class="panel"><div class="panel-title">\u7ecf\u8425\u5386\u7a0b</div><div class="panel-body">' +
        '<div class="toolbar"><button onclick="loadAll()">\u5237\u65b0</button><span class="muted">\u53cc\u51fb\u4e00\u884c\u53ef\u4ee5\u6253\u5f00\u5355\u636e\u5185\u5bb9</span></div>' +
        '<table data-key="operations"><thead><tr><th>\u65f6\u95f4</th><th>\u5355\u636e\u7c7b\u578b</th><th>\u5ba2\u6237</th><th>\u4ef7\u683c</th><th>\u5355\u636e\u7f16\u53f7</th><th>\u72b6\u6001</th><th>\u64cd\u4f5c</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '</div></div>';
      applyColumnMemory();
    });
  }

  function renderMovements() {
    get("/api/movements", function (list) {
      var rows = "";
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        rows += '<tr><td>' + htmlEscape(m.created_at) + '</td><td>' + htmlEscape(m.doc_no) + '</td><td>' + htmlEscape(titles[m.doc_type] || m.doc_type) + '</td><td>' + htmlEscape(m.product_code) + '</td><td>' + htmlEscape(m.product_name) + '</td><td>' + htmlEscape(m.warehouse_name) + '</td><td class="num">' + (m.direction > 0 ? "+" : "-") + fmt(m.quantity) + '</td><td class="num">' + fmt(m.before_qty) + '</td><td class="num">' + fmt(m.after_qty) + '</td><td>' + htmlEscape(m.operator) + '</td><td>' + htmlEscape(m.remark) + '</td></tr>';
      }
      $("view").innerHTML =
        '<div class="panel"><div class="panel-title">库存流水</div><div class="panel-body">' +
        '<div class="toolbar"><button onclick="loadAll()">刷新</button><span class="muted">最近 500 条</span></div>' +
        '<table data-key="movements"><thead><tr><th>时间</th><th>单号</th><th>类型</th><th>编号</th><th>商品</th><th>仓库</th><th>变化</th><th>前库存</th><th>后库存</th><th>经手人</th><th>备注</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '</div></div>';
      applyColumnMemory();
    });
  }


  function templateDefaultText() {
    return '<!--\n' +
      '\u6253\u5370\u5355\u6a21\u677f\uff0c\u53ef\u4ee5\u76f4\u63a5\u4fee\u6539\u3002\n' +
      '\u5e38\u7528\u5360\u4f4d\u7b26\uff1a{{doc_no}} {{customer_name}} {{warehouse_name}} {{operator}} {{date}} {{items}} {{total_qty}} {{total_amount}} {{amount_upper}}\n' +
      '-->\n' + defaultTicketTemplate();
  }

  function renderTemplateEditor() {
    $("view").innerHTML =
      '<div class="panel"><div class="panel-title">\u6253\u5370\u6a21\u677f\u8bbe\u7f6e</div><div class="panel-body">' +
      '<div class="toolbar template-toolbar"><button id="btn_save_template" class="primary" type="button">\u4fdd\u5b58\u6a21\u677f</button><button id="btn_load_template" type="button">\u91cd\u65b0\u8bfb\u53d6</button><button id="btn_reset_template" type="button">\u6062\u590d\u9ed8\u8ba4</button><button id="btn_toggle_template" type="button">\u663e\u793a/\u9690\u85cf\u4ee3\u7801</button><span id="template_save_state" class="badge">\u672a\u4fdd\u5b58</span></div>' +
      '<div class="muted">\u4e0b\u9762\u662f\u53ef\u89c6\u5316\u6253\u5370\u5355\uff1a\u76f4\u63a5\u70b9\u6587\u5b57\u6216\u8868\u683c\u4fee\u6539\uff0c\u6539\u5b8c\u70b9\u4fdd\u5b58\u6a21\u677f\u3002\u4e0d\u8981\u5220\u6389 {{items}}\uff0c\u5b83\u662f\u5546\u54c1\u660e\u7ec6\u884c\u7684\u4f4d\u7f6e\u3002</div>' +
      '<div class="template-workbench"><div id="template_visual" class="template-visual" contenteditable="true"></div></div>' +
      '<textarea id="template_editor" class="template-editor" style="display:none"></textarea>' +
      '</div></div>';
    bindTemplateButtons();
    loadPrintTemplate();
  }


  function bindTemplateButtons() {
    var saveBtn = $("btn_save_template");
    var loadBtn = $("btn_load_template");
    var resetBtn = $("btn_reset_template");
    var toggleBtn = $("btn_toggle_template");
    if (saveBtn) saveBtn.onclick = window.savePrintTemplate;
    if (loadBtn) loadBtn.onclick = window.loadPrintTemplate;
    if (resetBtn) resetBtn.onclick = window.resetPrintTemplate;
    if (toggleBtn) toggleBtn.onclick = window.toggleTemplateSource;
  }

  function setTemplateSaveState(text) {
    var el = $("template_save_state");
    if (el) el.innerHTML = htmlEscape(text);
    setStatus(text);
  }

  function setTemplateEditor(content) {
    var source = $("template_editor");
    var visual = $("template_visual");
    if (source) source.value = content;
    if (visual) visual.innerHTML = content;
  }

  function getTemplateEditorContent() {
    var source = $("template_editor");
    var visual = $("template_visual");
    if (source && source.style.display !== "none") return source.value;
    if (visual) return visual.innerHTML;
    return source ? source.value : "";
  }

  window.toggleTemplateSource = function () {
    var source = $("template_editor");
    var visual = $("template_visual");
    if (!source || !visual) return;
    if (source.style.display === "none") {
      source.value = visual.innerHTML;
      source.style.display = "block";
      visual.style.display = "none";
    } else {
      visual.innerHTML = source.value;
      source.style.display = "none";
      visual.style.display = "block";
    }
  };

  window.loadPrintTemplate = function () {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/print-template?v=" + new Date().getTime(), true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      setTemplateEditor(xhr.status >= 200 && xhr.status < 300 ? xhr.responseText : templateDefaultText());
      setTemplateSaveState("\u6a21\u677f\u5df2\u8bfb\u53d6");
      toast("\u6253\u5370\u6a21\u677f\u5df2\u8bfb\u53d6");
    };
    xhr.send(null);
  };

  window.savePrintTemplate = function () {
    var content = getTemplateEditorContent();
    if (content.indexOf("{{items}}") < 0 && !confirm("\u6a21\u677f\u91cc\u6ca1\u6709 {{items}}\uff0c\u6253\u5370\u65f6\u53ef\u80fd\u4e0d\u663e\u793a\u5546\u54c1\u660e\u7ec6\u3002\u8fd8\u8981\u4fdd\u5b58\u5417\uff1f")) return;
    post("/api/print-template", { content: content }, function () {
      setTemplateEditor(content);
      setTemplateSaveState("\u5df2\u4fdd\u5b58\uff1a" + new Date().toLocaleTimeString());
      toast("\u6253\u5370\u6a21\u677f\u5df2\u4fdd\u5b58");
    });
  };

  window.resetPrintTemplate = function () {
    if (!confirm("\u786e\u5b9a\u6062\u590d\u9ed8\u8ba4\u6253\u5370\u6a21\u677f\uff1f")) return;
    setTemplateEditor(templateDefaultText());
    savePrintTemplate();
  };

  function renderBackup() {
    $("view").innerHTML =
      '<div class="panel"><div class="panel-title">数据备份</div><div class="panel-body">' +
      '<p>点击后会把当前 SQLite 数据库复制到项目的 backups 文件夹。</p>' +
      '<p><button class="primary" onclick="doBackup()">立即备份</button></p>' +
      '<p id="backup_result" class="muted"></p>' +
      '</div></div>';
  }
  window.doBackup = function () {
    post("/api/backup", {}, function (r) { $("backup_result").innerHTML = "备份完成：" + htmlEscape(r.file); toast("备份完成"); });
  };

  function renderAssistant() {
    $("view").innerHTML =
      '<div class="panel"><div class="panel-title">数据助手</div><div class="panel-body">' +
      '<div class="toolbar"><input id="assistant_q" style="max-width:320px" placeholder="输入商品、客户、供应商、单号、分类"><button class="primary" onclick="assistantSearch()">查找</button><button onclick="assistantSummary()">归类汇总</button></div>' +
      '<div class="muted">这里是给人用的页面，也是给 Codex/AI 连接软件的数据入口。接口：/api/assistant/search?q=关键词，/api/assistant/summary。</div>' +
      '</div></div><div id="assistant_result"></div>';
    assistantSummary();
  }

  window.assistantSearch = function () {
    var q = $("assistant_q").value;
    if (!q) return toast("请输入关键词");
    get("/api/assistant/search?q=" + encodeURIComponent(q), function (r) {
      $("assistant_result").innerHTML =
        assistantTable("商品", ["code", "name", "category", "spec", "unit", "cost_price", "sale_price"], r.products) +
        assistantTable("客户", ["code", "name", "contact", "phone", "address"], r.customers) +
        assistantTable("供应商", ["code", "name", "contact", "phone", "address"], r.suppliers) +
        assistantTable("单据", ["doc_no", "doc_type", "partner_name", "warehouse_name", "total_amount", "balance_amount", "status", "created_at"], r.documents) +
        assistantTable("库存", ["product_code", "product_name", "category", "warehouse_name", "quantity", "cost_price", "stock_amount"], r.inventory);
      applyColumnMemory();
    });
  };

  window.assistantSummary = function () {
    get("/api/assistant/summary", function (r) {
      $("assistant_result").innerHTML =
        assistantTable("按分类库存汇总", ["category", "product_count", "quantity", "amount"], r.stock_by_category) +
        assistantTable("库存预警", ["code", "name", "category", "warehouse_name", "quantity", "min_stock"], r.low_stock) +
        assistantTable("单据金额汇总", ["doc_type", "status", "count", "amount", "balance"], r.document_amount_by_type) +
        assistantTable("未分类商品", ["id", "code", "name", "spec", "unit", "cost_price", "sale_price"], r.uncategorized_products);
      applyColumnMemory();
    });
  };

  function assistantTable(title, fields, list) {
    var head = "", body = "";
    for (var i = 0; i < fields.length; i++) head += "<th>" + htmlEscape(fields[i]) + "</th>";
    for (var r = 0; r < list.length; r++) {
      body += "<tr>";
      for (var f = 0; f < fields.length; f++) body += "<td>" + htmlEscape(list[r][fields[f]]) + "</td>";
      body += "</tr>";
    }
    if (!list.length) body = '<tr><td colspan="' + fields.length + '" class="muted">没有数据</td></tr>';
    return '<div class="panel"><div class="panel-title">' + htmlEscape(title) + '</div><div class="panel-body"><table data-key="assistant_' + htmlEscape(title) + '"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div></div>';
  }

  function renderPartnersAfterLoad() {
    if (state.active === "customers") renderPartners("customer");
    else if (state.active === "suppliers") renderPartners("supplier");
    else render();
  }

  function input(label, id, value) {
    return '<label>' + label + '</label><input id="' + id + '" value="' + htmlEscape(value) + '">';
  }
  function labelValue(label, value) {
    return '<label>' + label + '</label><input value="' + htmlEscape(value) + '" readonly>';
  }

  function loadAll(done) {
    var left = 5;
    function finish() {
      left--;
      if (left === 0) {
        renderTabs();
        if (done) done(); else renderPartnersAfterLoad();
      }
    }
    get("/api/products", function (x) { state.products = x; finish(); });
    get("/api/partners/customer", function (x) { state.customers = x; finish(); });
    get("/api/partners/supplier", function (x) { state.suppliers = x; finish(); });
    get("/api/warehouses", function (x) { state.warehouses = x; finish(); });
    get("/api/inventory", function (x) { state.inventory = x; finish(); });
  }
  window.loadAll = loadAll;

  function applyColumnMemory() {
    var tables = document.getElementsByTagName("table");
    for (var i = 0; i < tables.length; i++) {
      (function (table) {
        var key = table.getAttribute("data-key");
        if (!key) return;
        if ((" " + table.className + " ").indexOf(" sheet ") >= 0) return;
        var widths = {};
        try { widths = JSON.parse(localStorage.getItem("jxc_width_" + key) || "{}"); } catch (e) {}
        var ths = table.getElementsByTagName("th");
        for (var j = 0; j < ths.length; j++) {
          if (widths[j]) ths[j].style.width = widths[j] + "px";
          ths[j].onmouseup = function () {
            var next = {};
            for (var k = 0; k < ths.length; k++) next[k] = ths[k].offsetWidth;
            try { localStorage.setItem("jxc_width_" + key, JSON.stringify(next)); } catch (e) {}
          };
        }
      })(tables[i]);
    }
  }

  function tick() {
    var d = new Date();
    $("clock").innerHTML = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  $("serverText").innerHTML = location.host;
  setInterval(tick, 1000);
  tick();
  loadAll(function () { renderTabs(); renderHome(); toast("系统已就绪"); });
})();
