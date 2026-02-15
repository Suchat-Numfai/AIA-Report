// ==========================================
// ส่วนที่ 1: การจัดการตารางและ Logic พื้นฐาน
// ==========================================
const BATCH_NAMES = ["BCWSCHQ-TMB_BATCH 1", "BCWSCHQ-TMB_BATCH 2.1", "BCWSCHQ-TMB_BATCH 2.2", "BCWSCHQ-TMB_BATCH 3"];
let batchTemplates = [
    { id: '1', name: BATCH_NAMES[0], isOptional: false, isVisible: true, subItems: [], toRunValue: '', statusValue: 'Completed' },
    { id: '2_1', name: BATCH_NAMES[1], isOptional: true, isVisible: false, subItems: [], toRunValue: '', statusValue: 'Completed' },
    { id: '2_2', name: BATCH_NAMES[2], isOptional: true, isVisible: false, subItems: [], toRunValue: '', statusValue: 'Completed' },
    { id: '3', name: BATCH_NAMES[3], isOptional: true, isVisible: false, subItems: [], toRunValue: '', statusValue: 'Completed' }
];

function getAllBatchItemsInOrder() {
    let allItems = [];
    batchTemplates.forEach(template => {
        if (template.isVisible) {
            allItems.push({ ...template, fullId: template.id, subIndex: 0, displayName: template.name });
            template.subItems.forEach((sub, index) => {
                const subId = `${template.id}_sub_${index + 1}`; 
                allItems.push({ ...template, ...sub, fullId: subId, subIndex: index + 1, displayName: `${template.name}.${index + 1}` }); 
            });
        }
    });
    return allItems;
}

function renderTable() {
    const tableBody = document.getElementById('batchTableBody');
    if(!tableBody) return;
    tableBody.innerHTML = '';
    getAllBatchItemsInOrder().forEach(batch => {
        const fullId = batch.fullId;
        const isSub = batch.subIndex > 0;
        const tr = document.createElement('tr');
        tr.id = `batch-row-${fullId}`;
        tr.innerHTML = `
            <td style="${isSub ? 'padding-left: 25px; color: #555;' : 'font-weight: 500;'}">${batch.displayName}</td>
            <td><input type="number" class="form-control form-control-sm text-end" id="startChq${fullId}" readonly value="0"></td>
            <td><input type="number" class="form-control form-control-sm text-end" id="fromRun${fullId}" readonly value="0"></td>
            <td><input type="number" class="form-control form-control-sm text-end" id="toChq${fullId}" readonly value="0"></td>
            <td class="green-bg"><input type="number" class="form-control form-control-sm text-end" id="toRun${fullId}" value="${batch.toRunValue || ''}"></td>
            <td>
                <select class="form-select form-select-sm" id="status${fullId}">
                    <option value="Completed" ${batch.statusValue === 'Completed' ? 'selected' : ''}>COMPLETED</option>
                    <option value="Voided" ${batch.statusValue === 'Voided' ? 'selected' : ''}>VOIDED</option>
                </select>
            </td>
            <td><input type="number" class="form-control form-control-sm text-end" id="totalChq${fullId}" readonly value="0"></td>
            <td>
                ${!isSub ? `<button class="btn btn-sm btn-info" onclick="addNewSubBatch('${batch.id}')">เพิ่มข้อมูล</button>` : ''}
                ${(isSub || batch.isOptional) ? `<button class="btn btn-sm btn-danger" onclick="removeSubBatch('${batch.id}', ${batch.subIndex})">ลบ</button>` : ''}
            </td>`;
        tableBody.appendChild(tr);
        document.getElementById(`toRun${fullId}`).addEventListener('input', (e) => updateDataValue(fullId, 'toRunValue', e.target.value));
        document.getElementById(`status${fullId}`).addEventListener('change', (e) => updateDataValue(fullId, 'statusValue', e.target.value));
    });
    calculateAll();
}

function updateDataValue(fullId, field, value) {
    if (fullId.includes('_sub_')) {
        const parts = fullId.split('_sub_');
        const batch = batchTemplates.find(t => t.id === parts[0]);
        if(batch) batch.subItems[parseInt(parts[1]) - 1][field] = value;
    } else {
        const batch = batchTemplates.find(t => t.id === fullId);
        if(batch) batch[field] = value;
    }
    calculateAll();
}

function addNewSubBatch(parentId) {
    const idx = batchTemplates.findIndex(t => t.id === parentId);
    if (batchTemplates[idx + 1] && !batchTemplates[idx + 1].isVisible) batchTemplates[idx + 1].isVisible = true;
    else batchTemplates[idx].subItems.push({ toRunValue: '', statusValue: 'Completed' });
    renderTable();
}

function removeSubBatch(parentId, subIndex) {
    const batch = batchTemplates.find(t => t.id === parentId);
    if (batch) {
        if (subIndex > 0) batch.subItems.splice(subIndex - 1, 1);
        else { batch.isVisible = false; batch.toRunValue = ''; batch.subItems = []; }
        renderTable();
    }
}

// ==========================================
// ส่วนที่ 2: คำนวณ (จบที่กล่อง 25)
// ==========================================
function calculateAll() {
    let startChqNo = parseInt(document.getElementById('startChequeNo').value) || 0;
    let startBox = parseInt(document.getElementById('startBox').value) || 0;
    let currentFromRun = 1, lastToChq = startChqNo - 1, grandTotal = 0, finalEffectiveToChq = startChqNo > 0 ? startChqNo - 1 : 0; 

    getAllBatchItemsInOrder().forEach(item => {
        const fullId = item.fullId, toRun = parseInt(item.toRunValue) || 0, startChq = lastToChq + 1;
        document.getElementById(`startChq${fullId}`).value = startChq;
        document.getElementById(`fromRun${fullId}`).value = currentFromRun;
        if (toRun >= currentFromRun) {
            const total = toRun - currentFromRun + 1, toChq = (startChq + total) - 1;
            document.getElementById(`totalChq${fullId}`).value = total;
            document.getElementById(`toChq${fullId}`).value = toChq;
            grandTotal += total; lastToChq = toChq; currentFromRun = toRun + 1; finalEffectiveToChq = toChq; 
        } else {
            document.getElementById(`totalChq${fullId}`).value = 0;
            document.getElementById(`toChq${fullId}`).value = 0;
        }
    });

    let offsetInBox = (startChqNo > 0) ? (startChqNo - 1) % 1000 : 0;
    let boxesUsed = Math.ceil((offsetInBox + grandTotal) / 1000); 
    let endBox = (startBox > 0 && grandTotal > 0) ? ((startBox + (boxesUsed - 1) - 1) % 200) + 1 : startBox;

    document.getElementById('grandTotalChqTable').innerText = grandTotal.toLocaleString();
    document.getElementById('nextChequeNo').innerText = (lastToChq + 1).toLocaleString();
    document.getElementById('EndChequeNo').innerText = finalEffectiveToChq.toLocaleString();
    document.getElementById('currentBox').innerText = endBox.toLocaleString();
    if (document.getElementById('endBox')) document.getElementById('endBox').value = endBox;

// --- ส่วนที่เพิ่มใหม่ ---
	let boxDiff = 0;
	if (startBox > 0 && endBox >= startBox && grandTotal > 0) {
   	 boxDiff = (endBox - startBox) + 1;
	}
	if (document.getElementById('totalBoxes')) {
    	document.getElementById('totalBoxes').value = boxDiff;
	}
// --------------------
// --- ส่วนการคำนวณกล่องถัดไป (ฉบับปรับปรุงตามเงื่อนไขจำนวนเช็คในกล่อง) ---
let nextBoxValue = endBox; 

// ตรวจสอบตำแหน่งเช็คใบสุดท้ายในกล่อง (0-999)
let lastChequePosition = (startChqNo > 0) ? (finalEffectiveToChq % 1000) : 0;

// ถ้าใบสุดท้ายลงท้ายด้วย 000 (เช่น 1000, 2000) แสดงว่ากล่องเต็มพอดี ให้ขึ้นกล่องใหม่
if (finalEffectiveToChq > 0 && lastChequePosition === 0) {
    nextBoxValue = endBox + 1;
}

// วนกล่องกลับมาที่ 1 เมื่อเกิน 200 ตามระบบของคุณ
if (nextBoxValue > 200) {
    nextBoxValue = 1;
}

if (document.getElementById('nextBox')) {
    document.getElementById('nextBox').innerText = (grandTotal > 0) ? nextBoxValue.toLocaleString() : "0";
}
// -------------------------------------------------------

    generateBarcode();
}






function generateBarcode() {
    const orderInput = document.getElementById('productionOrder');
    const val = orderInput ? orderInput.value.trim() : "";
    const barcodeElement = document.querySelector("#barcode");

    // ตรวจสอบว่าถ้าไม่มีข้อมูล (ค่าว่าง) ให้ล้างบาร์โค้ดทิ้ง
    if (val === "") {
        if (barcodeElement) {
            barcodeElement.innerHTML = ""; // ล้างเนื้อหาใน SVG ออก
        }
        return;
    }

    // ถ้ามีข้อมูล ค่อยสร้างบาร์โค้ด
    if (typeof JsBarcode === "function") {
        JsBarcode("#barcode", val, { 
            format: "CODE128", 
            width: 1.5, 
            height: 40, 
            displayValue: true 
        });
    }
}


// ==========================================
// ส่วนที่ 3: Export Text (คืนค่าสเปก AIA)
// ==========================================
function generateTextContent() {
    calculateAll();
    const dateInput = document.getElementById('inputDate').value;
    if (!dateInput) return { content: null, error: "กรุณาเลือก 'รอบวันที่' ก่อน" };
    const startChq = document.getElementById('startChequeNo').value;
    if (!startChq || parseInt(startChq) === 0) return { content: null, error: "กรุณากรอก 'เริ่มเลขเช็ค' ก่อน" };

    const d = new Date(dateInput + 'T00:00:00');
    let content = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}\n`;

    getAllBatchItemsInOrder().forEach(batch => {
        const fId = batch.fullId;
        const sChq = String(document.getElementById(`startChq${fId}`).value).padStart(10, '0');
        const fRun = String(document.getElementById(`fromRun${fId}`).value).padStart(10, '0');
        const tChq = String(document.getElementById(`toChq${fId}`).value).padStart(10, '0');
        const tRun = String(document.getElementById(`toRun${fId}`).value).padStart(10, '0');
        const status = document.getElementById(`status${fId}`).value.toUpperCase();
        const total = String(document.getElementById(`totalChq${fId}`).value);

        const statusPad = status === 'VOIDED' ? '   ' : '';
        const dotsPad = ' '.repeat(Math.max(0, 29 - total.length));
        const line = `${batch.displayName.padEnd(34)}${sChq} ${fRun} ${tChq} ${tRun} ${status}${statusPad}${' '.repeat(21)}${total}${dotsPad}.`;
        content += line + "\n";
    });
    return { content, error: null };
}

function exportToText() {
    const res = generateTextContent();
    if (res.error) return alert(res.error);
    const blob = new Blob([res.content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'BATCHCHQ.txt';
    a.click();
}

// ==========================================
// ส่วนที่ 4: Export Excel (คืนค่าจัดวางตามเซลล์)
// ==========================================
function exportToExcel() {
    calculateAll();
    const dateInput = document.getElementById('inputDate').value;
    const startChq = document.getElementById('startChequeNo').value;
    if (!dateInput || !startChq) return alert("กรุณากรอกข้อมูลให้ครบ");

    const visibleBatches = getAllBatchItemsInOrder();
    const totalComp = visibleBatches.filter(b => document.getElementById(`status${b.fullId}`).value === 'Completed').reduce((s, b) => s + (parseInt(document.getElementById(`totalChq${b.fullId}`).value) || 0), 0);
    const totalVoid = visibleBatches.filter(b => document.getElementById(`status${b.fullId}`).value === 'Voided').reduce((s, b) => s + (parseInt(document.getElementById(`totalChq${b.fullId}`).value) || 0), 0);

    const d = new Date(dateInput + 'T00:00:00');
    const excelDate = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`;

    const batchRows = visibleBatches.map(b => {
        const fId = b.fullId;
        const stat = document.getElementById(`status${fId}`).value;
        const tot = parseInt(document.getElementById(`totalChq${fId}`).value) || 0;
        return [null, b.displayName, parseInt(document.getElementById(`startChq${fId}`).value), parseInt(document.getElementById(`fromRun${fId}`).value), parseInt(document.getElementById(`toChq${fId}`).value), parseInt(document.getElementById(`toRun${fId}`).value), stat, tot, "", (stat === 'Completed' ? tot : 0)];
    });

    const worksheetData = [
        ["Daily Cheque Distribution Control Sheet"],
        ["To:", "AIA - Data Center and Finance"], [],
        ["Cycle Date:", excelDate], [],
        [null, "TOPIC", "Start Cheque No.", "Start Box No.", "End Cheque No.", "End Box No.", "Total Box", "Total of Cheque"],
        [null, "TOTAL CHEQUE PRINTING", parseInt(startChq), parseInt(document.getElementById('startBox').value), (parseInt(document.getElementById('EndChequeNo').innerText.replace(/,/g,''))), parseInt(document.getElementById('endBox').value), (parseInt(document.getElementById('endBox').value) - parseInt(document.getElementById('startBox').value) + 1), totalComp],
        [],
        [null, "Detail of Cheque Printing", "Start Cheque No.", "From Running No.", "To Cheque No.", "To Running No.", "Status", "Total of Cheque", "Remark", "Verified"],
        ...batchRows,
        [], [],
        [null, null, null, null, null, "Total Completed Cheques", null, totalComp],
        [null, null, null, null, null, "Total Voided Cheques", null, totalVoid],
        [null, null, null, null, null, "Total Cheques", null, totalComp + totalVoid],
        [],
        [null, "Prepared by:"],
        [null, "Vendor BLANK Cheque in Stock", "Starting No.", "Box No.", "Ending No.", "Box No.", "Total Box", "Total of Cheque"],
        [null, "Vendor Stock", (parseInt(document.getElementById('EndChequeNo').innerText.replace(/,/g,'')) + 1), parseInt(document.getElementById('endBox').value), null, null, null, null]
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cheque Report");
    XLSX.writeFile(wb, `Daily_Cheque_${excelDate.replace(/\//g,'')}.xlsx`);
}

document.addEventListener('DOMContentLoaded', () => {
    const dIn = document.getElementById('inputDate');
    if(dIn) dIn.value = new Date().toISOString().split('T')[0];
    ['startChequeNo', 'startBox', 'productionOrder'].forEach(id => document.getElementById(id)?.addEventListener('input', calculateAll));
    renderTable();
});


// ฟังก์ชันสำหรับบันทึกข้อมูลลงใน Browser (LocalStorage)
function saveToLog() {
    const logData = {
        timestamp: new Date().toLocaleString(),
        order: document.getElementById('productionOrder').value || '-',
        startChq: document.getElementById('startChequeNo').value || '0',
        endChq: document.getElementById('EndChequeNo').innerText || '0',
        boxes: `${document.getElementById('startBox').value || '0'} - ${document.getElementById('endBox').value || '0'}`,
        total: document.getElementById('grandTotalChqTable').innerText || '0'
    };

    // ดึงข้อมูลเก่าออกมา ถ้าไม่มีให้เริ่มเป็น Array ว่าง
    let history = JSON.parse(localStorage.getItem('printingLogs')) || [];
    history.unshift(logData); // เพิ่มข้อมูลใหม่ไว้ด้านบนสุด
    localStorage.setItem('printingLogs', JSON.stringify(history));
    
    renderLogTable();
    alert('บันทึกข้อมูลสำเร็จ!');
}

// ฟังก์ชันสำหรับแสดงผลตารางประวัติ
function renderLogTable() {
    const history = JSON.parse(localStorage.getItem('printingLogs')) || [];
    const tbody = document.getElementById('logTableBody');
    if (!tbody) return;

    tbody.innerHTML = history.map(item => `
        <tr>
            <td>${item.timestamp}</td>
            <td>${item.order}</td>
            <td>${item.startChq}</td>
            <td>${item.endChq}</td>
            <td>${item.boxes}</td>
            <td class="text-primary fw-bold">${item.total}</td>
        </tr>
    `).join('');
}

// ฟังก์ชันสำหรับ Export เป็นไฟล์ CSV (Master Log)
function downloadMasterLog() {
    const history = JSON.parse(localStorage.getItem('printingLogs')) || [];
    if (history.length === 0) return alert('ไม่มีข้อมูลประวัติให้ดาวน์โหลด');

    let csvContent = "\uFEFF"; // รองรับภาษาไทยใน Excel
    csvContent += "Timestamp,Production Order,Start Cheque,End Cheque,Box Range,Total Cheque\n";
    
    history.forEach(item => {
        csvContent += `"${item.timestamp}","${item.order}","${item.startChq}","${item.endChq}","${item.boxes}","${item.total}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Master_Log_Printing_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function clearLog() {
    if (confirm('คุณต้องการล้างประวัติทั้งหมดใช่หรือไม่?')) {
        localStorage.removeItem('printingLogs');
        renderLogTable();
    }
}


// เรียกใช้เมื่อโหลดหน้าจอ
document.addEventListener('DOMContentLoaded', () => {
    renderLogTable(); 
});

