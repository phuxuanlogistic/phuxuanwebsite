'use strict';
const query = new URLSearchParams(location.search);
const menu = document.getElementById('menu');
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') === 'false';
  menu.setAttribute('aria-expanded', String(open));
  document.getElementById('navigation').classList.toggle('open', open);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    menu.click();
    menu.focus();
  }
});

const quote = document.getElementById('quote');
const contact = document.getElementById('contact');
const tracking = document.getElementById('tracking');
const emailAddress = 'pxl.dieudo@gmail.com';
const demoCode = 'DEMO-PXL-001';

function checkContact(form) {
  if (form.elements.email.value.trim() || form.elements.phone.value.trim()) return true;
  form.querySelector('.error').textContent = 'Nhập email hoặc số điện thoại để PXL có thể phản hồi.';
  form.elements.email.focus();
  return false;
}

function bindReview(form) {
  const review = document.getElementById('review');
  const summary = document.getElementById('summary');
  const link = document.getElementById('email-link');
  const note = document.getElementById('email-note');
  const status = document.getElementById('copy-status');
  document.getElementById('edit').addEventListener('click', () => {
    review.hidden = true;
    form.hidden = false;
    form.querySelector('section[data-step]:not([hidden]) h2, input').focus();
  });
  document.getElementById('copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summary.value);
      status.textContent = 'Đã sao chép nội dung.';
    } catch {
      summary.focus();
      summary.select();
      status.textContent = 'Nội dung đã được chọn. Dùng Ctrl+C hoặc chức năng sao chép trên điện thoại.';
    }
  });
  return (subject, body) => {
    const base = 'mailto:' + emailAddress + '?subject=' + encodeURIComponent(subject);
    const full = base + '&body=' + encodeURIComponent(body.replace(/\n/g, '\r\n'));
    const long = full.length > 1800;
    summary.value = body;
    link.href = long ? base : full;
    note.textContent = long
      ? 'Nội dung dài. Hãy sao chép, mở email, dán nội dung, đính kèm hồ sơ nếu có rồi bấm Gửi.'
      : 'Ứng dụng email sẽ mở bản nháp. Hãy kiểm tra nội dung, đính kèm hồ sơ nếu có rồi bấm Gửi.';
    status.textContent = '';
    form.hidden = true;
    review.hidden = false;
    document.getElementById('review-title').focus();
  };
}

function labelledValues(data, names) {
  return Object.entries(names).map(([key, label]) => {
    const value = String(data.get(key) ?? '').trim();
    return value ? label + ': ' + value : '';
  }).filter(Boolean);
}
const contactLabels = {name:'Họ tên', company:'Công ty', email:'Email', phone:'Điện thoại'};

if (contact) {
  const review = bindReview(contact);
  if (query.get('ma') === demoCode) {
    contact.elements.topic.value = 'Tiến độ chuyến';
    contact.elements.message.value = 'Tôi muốn trao đổi về mã minh họa ' + demoCode + '.';
  }
  contact.addEventListener('submit', event => {
    event.preventDefault();
    contact.querySelector('.error').textContent = '';
    if (!checkContact(contact)) return;
    const data = new FormData(contact);
    const body = labelledValues(data, {...contactLabels, topic:'Chủ đề', message:'Nội dung'}).join('\n');
    review('PXL | ' + data.get('topic'), body);
  });
}

if (quote) {
  const steps = [...quote.querySelectorAll('[data-step]')];
  const kind = quote.elements.kind;
  const back = document.getElementById('back');
  const next = document.getElementById('next');
  const error = quote.querySelector('.error');
  const review = bindReview(quote);
  let step = 0;
  for (const key of ['origin', 'destination', 'amount', 'date']) {
    if (query.has(key)) quote.elements[key].value = query.get(key);
  }
  if (['general', 'project', 'unknown'].includes(query.get('kind'))) kind.value = query.get('kind');

  function updateStep(focus = false) {
    steps.forEach((panel, index) => { panel.hidden = index !== step; });
    for (const id of ['general','project']) {
      const section = document.getElementById(id);
      section.hidden = id !== kind.value;
    }
    for (const field of quote.querySelectorAll('input,select,textarea')) {
      field.disabled = Boolean(field.closest('[hidden]'));
    }
    back.hidden = step === 0;
    next.textContent = step === steps.length - 1 ? 'Xem lại yêu cầu →' : 'Tiếp tục →';
    document.getElementById('step-status').textContent = 'Bước ' + (step + 1) + ' / ' + steps.length;
    error.textContent = '';
    if (focus) steps[step].querySelector('h2').focus();
  }

  function summarize() {
    const enabled = [...quote.querySelectorAll('input,select,textarea')].filter(field => !field.disabled);
    for (const field of quote.querySelectorAll('input,select,textarea')) {
      field.disabled = Boolean(field.closest('#general[hidden], #project[hidden]'));
    }
    const data = new FormData(quote);
    const lines = ['YÊU CẦU BÁO GIÁ VẬN CHUYỂN', 'Nhóm hàng: ' + kind.selectedOptions[0].textContent,
      ...labelledValues(data, {origin:'Điểm nhận',destination:'Điểm giao',amount:'Số lượng / khối lượng dự kiến',date:'Ngày hàng sẵn sàng',deadline:'Hạn giao',cargo:'Tên hàng',tonnes:'Khối lượng (tấn)',packing:'Đóng gói',handling:'Bốc xếp',project:'Dự án',batch:'Mốc theo lô',consult:'Cần tư vấn thông tin kỹ thuật',notes:'Ghi chú'}),
      ...data.getAll('stop').map((stop,i) => 'Chặng ' + (i+1) + ': ' + stop + (data.getAll('leg-note')[i] ? ' · ' + data.getAll('leg-note')[i] : ''))];
    if (kind.value === 'project') {
      const values = Object.fromEntries(['item','qty','weight','length','width','height'].map(key => [key,data.getAll(key)]));
      values.item.forEach((item,i) => {
        const dimensions = ['length','width','height'].map(key => values[key][i] || 'chưa rõ');
        lines.push('Cấu kiện ' + (i+1) + ': ' + item + ' · ' + (values.qty[i] || 'chưa rõ') + ' kiện · ' + (values.weight[i] || 'chưa rõ') + ' tấn/kiện · ' + dimensions.join(' × ') + ' m (D × R × C)');
      });
      if (data.has('service')) lines.push('Dịch vụ cần trao đổi: ' + data.getAll('service').join(', '));
    }
    lines.push('', ...labelledValues(data, contactLabels));
    for (const field of quote.querySelectorAll('input,select,textarea')) field.disabled = !enabled.includes(field);
    return lines.join('\n');
  }

  quote.addEventListener('click', event => {
    const add = event.target.closest('[data-add]');
    const remove = event.target.closest('[data-remove]');
    if (add) {
      const type = add.dataset.add;
      const target = document.getElementById(type === 'leg' ? 'legs' : 'items');
      target.append(document.getElementById(type + '-template').content.cloneNode(true));
      target.lastElementChild.querySelector('input').focus();
    }
    if (remove) {
      const row = remove.closest('fieldset');
      const addButton = row.parentElement.nextElementSibling;
      row.remove();
      addButton.focus();
    }
  });
  kind.addEventListener('change', () => updateStep());
  back.addEventListener('click', () => { step--; updateStep(true); });
  quote.addEventListener('submit', event => {
    event.preventDefault();
    error.textContent = '';
    if (step === 0 && quote.elements.date.value && quote.elements.deadline.value &&
        quote.elements.deadline.value < quote.elements.date.value) {
      error.textContent = 'Hạn giao phải từ ngày hàng sẵn sàng trở đi.';
      quote.elements.deadline.focus();
      return;
    }
    if (step < steps.length - 1) { step++; updateStep(true); return; }
    if (checkContact(quote)) review('PXL | Yêu cầu báo giá vận chuyển', summarize());
  });
  updateStep();
}

if (tracking) {
  const field = tracking.elements.ma;
  const result = document.getElementById('result');
  const status = document.getElementById('tracking-status');
  function lookup() {
    const code = field.value.trim().toUpperCase();
    result.hidden = code !== demoCode;
    status.textContent = !code ? 'Nhập mã chuyến để tiếp tục.' : result.hidden
      ? 'Bản thử nghiệm chưa tra cứu được mã chuyến thực tế. Cậu có thể xem chuyến minh họa hoặc liên hệ PXL.'
      : 'Đã mở dữ liệu minh họa.';
  }
  tracking.addEventListener('submit', event => { event.preventDefault(); lookup(); });
  document.getElementById('demo').addEventListener('click', () => { field.value = demoCode; lookup(); });
  field.addEventListener('input', () => { result.hidden = true; status.textContent = ''; });
  if (query.has('ma')) { field.value = query.get('ma').slice(0,60); lookup(); }
}
