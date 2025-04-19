class CalendarGenerator {
    constructor(year, month) {
        this.year = year;
        this.month = month - 1; // JavaScript months are 0-based
        this.daysInMonth = new Date(year, month, 0).getDate();
    }

    getDays() {
        const days = [];
        for (let day = 1; day <= this.daysInMonth; day++) {
            const date = new Date(this.year, this.month, day);
            const weekday = date.getDay();
            days.push({ day, weekday });
        }
        return days;
    }
}

class HolidayPicker {
    constructor(holidaysInput) {
        this.holidays = holidaysInput ? holidaysInput.split(',').map(Number) : [];
    }

    getHolidays() {
        return new Set(this.holidays);
    }
}

class EmployeeManager {
    constructor() {
        this.employees = [];
    }

    loadEmployees() {
        const rows = document.querySelectorAll('#employeeTable tbody tr');
        const storedSchedules = localStorage.getItem('employeeSchedules');
        const schedules = storedSchedules ? JSON.parse(storedSchedules) : [];
        this.employees = [];

        rows.forEach(row => {
            const name = row.querySelector('.employee-name').value.trim();
            const hours = parseFloat(row.querySelector('.total-hours').value) || 0;
            if (name && hours > 0) {
                const storedEmployee = schedules.find(emp => emp.name === name && emp.totalHours === hours);
                this.employees.push({
                    name,
                    totalHours: hours,
                    restDays: storedEmployee && Array.isArray(storedEmployee.restDays) 
                        ? new Set(storedEmployee.restDays) 
                        : new Set(),
                    schedule: storedEmployee && Array.isArray(storedEmployee.schedule) 
                        ? storedEmployee.schedule 
                        : []
                });
            } else {
                console.warn(`Bỏ qua nhân viên: ${name}, totalHours: ${hours}`);
            }
        });
        console.log('Danh sách nhân viên:', this.employees);
        return this.employees;
    }
}

class WeekAnalyzer {
    constructor(days, holidays) {
        this.days = days;
        this.holidays = holidays;
    }

    getWeeks() {
        const weeks = [];
        let currentWeek = [];
        this.days.forEach(day => {
            if (day.weekday === 1 && currentWeek.length > 0) { // Monday starts a new week
                weeks.push(currentWeek);
                currentWeek = [];
            }
            currentWeek.push(day);
        });
        if (currentWeek.length > 0) {
            weeks.push(currentWeek);
        }

        const analyzedWeeks = weeks.map(week => {
            const workDays = week.filter(day => !this.holidays.has(day.day) && day.weekday !== 0).length;
            return {
                days: week,
                isComplete: workDays === 6, // Full week: Mon-Sat (excluding holidays and Sundays)
                workDays: workDays
            };
        });

        return analyzedWeeks;
    }
}

class DayOffDistributor {
    constructor(employees, weeks, holidays) {
        this.employees = employees;
        this.weeks = weeks;
        this.holidays = holidays;
    }

    distribute() {
        // Add Sundays and holidays to rest days for all employees
        this.employees.forEach(employee => {
            employee.restDays = new Set(this.holidays);
            this.weeks.forEach(week => {
                week.days.forEach(day => {
                    if (day.weekday === 0) { // Sunday
                        employee.restDays.add(day.day);
                    }
                });
            });
        });

        // Distribute rest days
        this.weeks.forEach(week => {
            if (week.isComplete) {
                // Complete week: Mon-Sat (excluding Sundays)
                // Only allow rest days from Monday to Friday (weekday 1 to 5)
                const weekdays = week.days.filter(day => day.weekday >= 1 && day.weekday <= 5 && !this.holidays.has(day.day));
                const restAssignments = new Array(weekdays.length).fill(0); // Track number of people resting each day
                const restDaysAssigned = new Array(this.employees.length).fill(false); // Track who has rested in this week

                // First pass: Ensure each employee rests exactly 1 day from Monday to Friday
                weekdays.forEach((_, dayIndex) => {
                    const availableEmployees = this.employees
                        .map((emp, idx) => ({ emp, idx }))
                        .filter((_, idx) => !restDaysAssigned[idx]);
                    if (availableEmployees.length === 0) return;

                    const { emp, idx } = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
                    const day = weekdays[dayIndex].day;

                    // Check for consecutive rest days
                    const prevDay = dayIndex > 0 ? weekdays[dayIndex - 1].day : null;
                    const nextDay = dayIndex < weekdays.length - 1 ? weekdays[dayIndex + 1].day : null;
                    if ((prevDay && emp.restDays.has(prevDay)) || (nextDay && emp.restDays.has(nextDay))) return;

                    emp.restDays.add(day);
                    restAssignments[dayIndex]++;
                    restDaysAssigned[idx] = true;
                });

                // Second pass: Ensure at least 2 people rest each day from Monday to Friday
                weekdays.forEach((_, dayIndex) => {
                    while (restAssignments[dayIndex] < 2) {
                        const availableEmployees = this.employees
                            .map((emp, idx) => ({ emp, idx }))
                            .filter((e, idx) => !e.emp.restDays.has(weekdays[dayIndex].day) && !restDaysAssigned[idx]);
                        if (availableEmployees.length === 0) break;

                        const { emp, idx } = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
                        const day = weekdays[dayIndex].day;
                        const prevDay = dayIndex > 0 ? weekdays[dayIndex - 1].day : null;
                        const nextDay = dayIndex < weekdays.length - 1 ? weekdays[dayIndex + 1].day : null;

                        if ((prevDay && emp.restDays.has(prevDay)) || (nextDay && emp.restDays.has(nextDay))) continue;

                        emp.restDays.add(day);
                        restAssignments[dayIndex]++;
                        restDaysAssigned[idx] = true;
                    }
                });

                // Ensure Saturday (weekday 6) is a working day for all employees unless it's a holiday
                const saturday = week.days.find(day => day.weekday === 6);
                if (saturday && !this.holidays.has(saturday.day)) {
                    // No additional rest days assigned on Saturday
                }
            } else {
                // Incomplete week
                const weekdays = week.days.filter(day => day.weekday >= 1 && day.weekday <= 6 && !this.holidays.has(day.day));
                if (weekdays.length === 1) {
                    // Only 1 workday
                    const day = weekdays[0].day;
                    // If the only day is Saturday (weekday 6), no one rests unless it's a holiday
                    if (weekdays[0].weekday === 6 && !this.holidays.has(day)) {
                        // Everyone works on Saturday
                    } else {
                        // Randomly select 1 person to rest
                        const employeeIndex = Math.floor(Math.random() * this.employees.length);
                        this.employees[employeeIndex].restDays.add(day);
                    }
                } else if (weekdays.length >= 2 && weekdays.length <= 4) {
                    // 2-4 workdays: 1 person rests each day, no one rests twice
                    // Exclude Saturday (weekday 6) from rest days
                    const restDays = weekdays.filter(day => day.weekday !== 6);
                    const restAssignments = new Array(this.employees.length).fill(false); // Track who has rested
                    restDays.forEach(day => {
                        const availableEmployees = this.employees.filter((_, idx) => !restAssignments[idx]);
                        if (availableEmployees.length > 0) {
                            const employeeIndex = Math.floor(Math.random() * availableEmployees.length);
                            const globalIndex = this.employees.indexOf(availableEmployees[employeeIndex]);
                            this.employees[globalIndex].restDays.add(day.day);
                            restAssignments[globalIndex] = true;
                        }
                    });
                }
            }
        });
    }
}

class HourAllocator {
    constructor(employees, days) {
        this.employees = employees;
        this.days = days;
    }

    allocate() {
        this.employees.forEach(employee => {
            console.log(`Phân bổ lịch cho ${employee.name}, totalHours: ${employee.totalHours}`);
            employee.schedule = [];

            const workDays = this.days.filter(day => !employee.restDays.has(day.day)).map(day => day.day);
            console.log(`workDays: ${workDays}`);

            if (workDays.length === 0) {
                console.warn(`Không có ngày làm việc cho ${employee.name}. Kiểm tra restDays:`, employee.restDays);
                return;
            }

            let remainingHours = employee.totalHours;
            const dailyHours = new Array(workDays.length).fill(0);

            let minHours, maxHours;
            if (employee.totalHours < 60) {
                minHours = 1;
                maxHours = 3;
            } else if (employee.totalHours < 105) {
                minHours = 4;
                maxHours = 6;
            } else {
                minHours = 6;
                maxHours = 8;
            }
            console.log(`minHours: ${minHours}, maxHours: ${maxHours}`);

            // Phân bổ giờ cho thứ Bảy
            const workDaysWithWeekday = workDays.map(day => {
                const dayInfo = this.days.find(d => d.day === day);
                return { day, weekday: dayInfo.weekday };
            });

            workDaysWithWeekday.forEach((workDay, i) => {
                if (workDay.weekday === 6) {
                    const random = Math.random();
                    let hours = random < 0.333 ? maxHours : random < 0.666 ? maxHours - 0.5 : maxHours - 1;
                    if (remainingHours >= hours) {
                        dailyHours[i] = hours;
                        remainingHours -= hours;
                        console.log(`Ngày ${workDay.day} (Thứ Bảy): ${hours} giờ`);
                    }
                }
            });

            // Phân bổ giờ tối thiểu cho các ngày còn lại
            workDaysWithWeekday.forEach((workDay, i) => {
                if (dailyHours[i] === 0) {
                    const hours = minHours;
                    if (remainingHours >= hours) {
                        dailyHours[i] = hours;
                        remainingHours -= hours;
                        console.log(`Ngày ${workDay.day}: ${hours} giờ`);
                    }
                }
            });

            // Phân phối giờ còn lại
            while (remainingHours > 0 && dailyHours.some((h, i) => h < maxHours && workDaysWithWeekday[i].weekday !== 6)) {
                const eligibleIndices = dailyHours
                    .map((h, idx) => ({ hours: h, idx }))
                    .filter(d => d.hours < maxHours && workDaysWithWeekday[d.idx].weekday !== 6);
                if (eligibleIndices.length === 0) break;

                const index = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)].idx;
                const increment = Math.random() < 0.5 ? 0.5 : 1;
                if (remainingHours >= increment && dailyHours[index] + increment <= maxHours) {
                    dailyHours[index] += increment;
                    remainingHours -= increment;
                    console.log(`Ngày ${workDaysWithWeekday[index].day}: +${increment} giờ, còn lại: ${remainingHours}`);
                }
            }

            console.log(`dailyHours: ${dailyHours}, remainingHours: ${remainingHours}`);

            // Tạo lịch
            let noBreakDays = Math.floor(Math.random() * 2) + 2;
            let noBreakCount = 0;

            workDays.forEach((day, i) => {
                const hours = dailyHours[i];
                if (hours === 0) return;

                const maxStartHour = 21 - hours;
                const startHour = 9 + Math.floor(Math.random() * (maxStartHour - 9 + 1));
                const startMinutes = Math.random() < 0.5 ? '00' : '30';
                const startTime = `${startHour}:${startMinutes}`;

                let breakTime = noBreakCount < noBreakDays && Math.random() < 0.3 ? 0 : (Math.random() < 0.5 ? 0.5 : 1);
                if (breakTime === 0) noBreakCount++;

                const endTime = new Date(`2023-01-01 ${startTime}`);
                endTime.setMinutes(endTime.getMinutes() + (hours + breakTime) * 60);
                const endHour = endTime.getHours();
                const endMinutes = endTime.getMinutes();

                let endTimeStr = '-';
                if (!isNaN(endHour) && !isNaN(endMinutes)) {
                    endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
                }

                employee.schedule.push({ day, startTime, endTime: endTimeStr, breakTime, hours });
                console.log(`Ngày ${day}: ${startTime} - ${endTimeStr}, nghỉ: ${breakTime}, giờ làm: ${hours}`);
            });

            if (employee.schedule.length === 0) {
                console.warn(`Lịch làm việc của ${employee.name} rỗng.`);
            }
        });
    }
}

class ScheduleRenderer {
    static formatHours(hours) {
        if (hours === 0) return '-';
        const wholeHours = Math.floor(hours);
        const minutes = (hours % 1 === 0.5) ? '30' : '00';
        return `${wholeHours}:${minutes}`;
    }

    static formatBreak(breakTime) {
        if (breakTime === 0) return '-';
        return breakTime === 0.5 ? '30p' : '60p';
    }

    static render(employees, days, month, year, holidays) {
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = '';

        employees.forEach((employee, index) => {
            let tableHTML = `<div id="employee-${index}" class="employee-result">`;
            tableHTML += `<h3>Zeiterfassung</h3>`;
            tableHTML += `<p>Monat: ${month}/${year}</p>`;
            tableHTML += `<p>Name, Vorname: ${employee.name}</p>`;
            tableHTML += `<table><thead><tr><th>Tag</th><th>Kommt</th><th>Geht</th><th>Pausen*</th><th>Arbeitsstunden</th><th>Abwesenheit</th></tr></thead><tbody>`;

            let totalWorkHours = 0;
            for (let day = 1; day <= days.length; day++) {
                const date = new Date(year, month - 1, day);
                const isSunday = date.getDay() === 0;
                const isHoliday = holidays.has(day);
                let row = `<tr><td>${day}</td>`;

                if (isSunday) {
                    row += `<td><span class="sunday-bold">-</span></td><td><span class="sunday-bold">-</span></td><td><span class="sunday-bold">-</span></td><td><span class="sunday-bold">-</span></td><td><span class="sunday">S</span></td>`;
                } else if (isHoliday) {
                    row += `<td><span class="holiday-bold">-</span></td><td><span class="holiday-bold">-</span></td><td><span class="holiday-bold">-</span></td><td><span class="holiday-bold">-</span></td><td><span class="holiday">F</span></td>`;
                } else if (employee.restDays.has(day)) {
                    row += `<td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>`;
                } else {
                    const scheduleEntry = employee.schedule.find(s => s.day === day);
                    if (scheduleEntry) {
                        totalWorkHours += scheduleEntry.hours;
                        row += `<td>${scheduleEntry.startTime}</td><td>${scheduleEntry.endTime}</td><td>${this.formatBreak(scheduleEntry.breakTime)}</td><td>${this.formatHours(scheduleEntry.hours)}</td><td>-</td>`;
                    } else {
                        row += `<td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>`;
                    }
                }
                row += `</tr>`;
                tableHTML += row;
            }

            tableHTML += `</tbody></table>`;
            tableHTML += `<p>Summe der Arbeitsstunden: ${this.formatHours(totalWorkHours)}</p>`;
            tableHTML += `<p>* Pausen: mind. 30 Minuten täglich (Eingabe im Format 00:00)</p>`;
            tableHTML += `<p>** Abwesenheit: U = Urlaub, K = Krankheit, F = Feiertag, G = Geschäftsreise, T = Zeitausgleich, S = Sonntag</p>`;
            tableHTML += `<button onclick="printSchedule(${index}, '${employee.name}', ${month}, ${year}, '${JSON.stringify(Array.from(holidays))}')">In</button>`;
            tableHTML += `</div>`;
            resultDiv.innerHTML += tableHTML;
        });
    }
}

class StatisticsGenerator {
    static generate(employees, days) {
        const stats = {
            totalEmployees: employees.length,
            totalWorkDays: days.filter(day => day.weekday !== 0).length,
            restDaysPerEmployee: employees.map(emp => ({
                name: emp.name,
                restDays: emp.restDays.size
            }))
        };
        return stats;
    }
}

function printSchedule(employeeId, employeeName, month, year, holidays) {
    const employee = new EmployeeManager().loadEmployees()[employeeId];
    const calendar = new CalendarGenerator(year, month);
    const days = calendar.getDays();
    const holidaySet = new Set(JSON.parse(holidays));

    // Kiểm tra nhân viên
    if (!employee) {
        console.error(`Nhân viên với employeeId=${employeeId} không tồn tại.`);
        alert('Không tìm thấy nhân viên. Vui lòng tạo lại lịch làm việc.');
        return;
    }
    if (!employee.schedule) {
        console.error(`Lịch làm việc của nhân viên ${employee.name} không được khởi tạo.`);
        alert('Lịch làm việc chưa được tạo. Vui lòng tạo lại lịch làm việc.');
        return;
    }
    if (!employee.name || typeof month !== 'number' || typeof year !== 'number') {
        console.error('Dữ liệu không hợp lệ:', { employee, month, year });
        alert('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const maxWidth = pageWidth - 2 * margin;
    let y = margin;

    // Nhúng font Arial
    doc.addFileToVFS('Arial.ttf', arialBase64);
    doc.addFont('Arial.ttf', 'Arial', 'normal');
    doc.setFont('Arial', 'normal');

    // Hàm chuẩn hóa văn bản
    function sanitizeText(text) {
        if (!text) return '';
        return decodeURIComponent(encodeURIComponent(text));
    }

    // Title
    try {
        doc.setFontSize(14);
        doc.text('Zeiterfassung', margin, y);
        y += 8;

        // Month and Name
        doc.setFontSize(10);
        doc.text(`Monat: ${month}/${year}`, margin, y);
        y += 6;
        doc.text(`Name, Vorname: ${sanitizeText(employee.name)}`, margin, y);
        y += 10;
    } catch (error) {
        console.error('Lỗi khi vẽ văn bản:', error);
        alert('Có lỗi khi tạo PDF. Vui lòng kiểm tra tên nhân viên.');
        return;
    }

    // Prepare table data
    const tableData = [];
    let totalWorkHours = 0;

    for (let day = 1; day <= days.length; day++) {
        const date = new Date(year, month - 1, day);
        const isSunday = date.getDay() === 0;
        const isHoliday = holidaySet.has(day);
        const row = [day.toString()];
        let styles = {};

        if (isSunday) {
            row.push('-', '-', '-', '-', 'S');
            styles = { textColor: [255, 0, 0], fontStyle: 'bold' };
        } else if (isHoliday) {
            row.push('-', '-', '-', '-', 'F');
            styles = { textColor: [46, 204, 113], fontStyle: 'bold' };
        } else if (employee.restDays.has(day)) {
            row.push('-', '-', '-', '-', '-');
            styles = {};
        } else {
            const scheduleEntry = employee.schedule.find(s => s.day === day);
            if (scheduleEntry) {
                totalWorkHours += scheduleEntry.hours;
                row.push(
                    scheduleEntry.startTime,
                    scheduleEntry.endTime,
                    ScheduleRenderer.formatBreak(scheduleEntry.breakTime),
                    ScheduleRenderer.formatHours(scheduleEntry.hours),
                    '-'
                );
                styles = {};
            } else {
                row.push('-', '-', '-', '-', '-');
                styles = {};
            }
        }

        tableData.push({ data: row, styles });
    }

    // Draw table
    try {
        doc.autoTable({
            startY: y,
            head: [['Tag', 'Kommt', 'Geht', 'Pausen*', 'Arbeitsstunden', 'Abwesenheit']],
            body: tableData.map(row => row.data),
            theme: 'grid',
            styles: {
                font: 'Arial',
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak',
                halign: 'center',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [52, 152, 219],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: maxWidth * 0.1 },
                1: { cellWidth: maxWidth * 0.18 },
                2: { cellWidth: maxWidth * 0.18 },
                3: { cellWidth: maxWidth * 0.18 },
                4: { cellWidth: maxWidth * 0.18 },
                5: { cellWidth: maxWidth * 0.18 }
            },
            didParseCell: (data) => {
                const rowIndex = data.row.index;
                if (data.row.section === 'body' && rowIndex < tableData.length) {
                    const styles = tableData[rowIndex].styles;
                    if (styles.textColor) {
                        data.cell.styles.textColor = styles.textColor;
                    }
                    if (styles.fontStyle) {
                        data.cell.styles.fontStyle = styles.fontStyle;
                    }
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi vẽ bảng:', error);
        alert('Có lỗi khi tạo bảng trong PDF.');
        return;
    }

    // Update y position after table
    y = doc.lastAutoTable.finalY + 8;

    // Total hours
    try {
        doc.setFontSize(10);
        doc.text(`Summe der Arbeitsstunden: ${ScheduleRenderer.formatHours(totalWorkHours)}`, margin, y);
        y += 6;

        // Notes
        doc.setFontSize(8);
        doc.text('* Pausen: mind. 30 Minuten täglich (Eingabe im Format 00:00)', margin, y);
        y += 5;
        doc.text('** Abwesenheit: U = Urlaub, K = Krankheit, F = Feiertag, G = Geschäftsreise, T = Zeitausgleich, S = Sonntag', margin, y);
    } catch (error) {
        console.error('Lỗi khi vẽ tổng giờ hoặc chú thích:', error);
        alert('Có lỗi khi thêm tổng giờ hoặc chú thích vào PDF.');
        return;
    }

    // Save PDF
    doc.save(`lich_lam_viec_${employeeName.replace(/\s+/g, '_')}.pdf`);
}

function saveEmployeesToStorage() {
    const rows = document.querySelectorAll('#employeeTable tbody tr');
    const employees = [];
    rows.forEach(row => {
        const name = row.querySelector('.employee-name').value.trim();
        const hours = parseFloat(row.querySelector('.total-hours').value) || 0;
        if (name) {
            employees.push({ name, hours });
        }
    });
    localStorage.setItem('employees', JSON.stringify(employees));
}

function loadEmployeesFromStorage() {
    const storedEmployees = localStorage.getItem('employees');
    const tbody = document.querySelector('#employeeTable tbody');
    tbody.innerHTML = ''; // Clear existing rows

    if (storedEmployees) {
        const employees = JSON.parse(storedEmployees);
        employees.forEach((emp, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><input type="text" class="employee-name" value="${emp.name}"></td>
                <td><input type="number" class="total-hours" min="0" value="${emp.hours || ''}"></td>
                <td><button onclick="deleteEmployee(this)">Xóa tên</button></td>
            `;
            tbody.appendChild(row);
        });
    }

    // Ensure at least 3 rows
    while (tbody.children.length < 3) {
        const row = document.createElement('tr');
        const index = tbody.children.length + 1;
        row.innerHTML = `
            <td>${index}</td>
            <td><input type="text" class="employee-name"></td>
            <td><input type="number" class="total-hours" min="0"></td>
            <td><button onclick="deleteEmployee(this)">Xóa tên</button></td>
        `;
        tbody.appendChild(row);
    }
}

function addEmployee() {
    const tbody = document.querySelector('#employeeTable tbody');
    const index = tbody.children.length + 1;
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${index}</td>
        <td><input type="text" class="employee-name"></td>
        <td><input type="number" class="total-hours" min="0"></td>
        <td><button onclick="deleteEmployee(this)">Xóa tên</button></td>
    `;
    tbody.appendChild(row);
    saveEmployeesToStorage();
}

function deleteEmployee(button) {
    const row = button.parentElement.parentElement;
    row.remove();
    // Reindex rows
    const tbody = document.querySelector('#employeeTable tbody');
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
    // Ensure at least 3 rows
    while (tbody.children.length < 3) {
        const row = document.createElement('tr');
        const index = tbody.children.length + 1;
        row.innerHTML = `
            <td>${index}</td>
            <td><input type="text" class="employee-name"></td>
            <td><input type="number" class="total-hours" min="0"></td>
            <td><button onclick="deleteEmployee(this)">Xóa tên</button></td>
        `;
        tbody.appendChild(row);
    }
    saveEmployeesToStorage();
}

function generateSchedule() {
    const monthInput = document.getElementById('month').value;
    if (!monthInput) {
        alert('Vui lòng chọn tháng!');
        return;
    }
    const [year, month] = monthInput.split('-').map(Number);
    const calendar = new CalendarGenerator(year, month);
    const days = calendar.getDays();

    const holidayPicker = new HolidayPicker(document.getElementById('holidays').value);
    const holidays = holidayPicker.getHolidays();

    const employeeManager = new EmployeeManager();
    const employees = employeeManager.loadEmployees();
    if (employees.length === 0) {
        alert('Vui lòng nhập ít nhất một nhân viên và tổng số giờ làm!');
        return;
    }

    saveEmployeesToStorage();

    const weekAnalyzer = new WeekAnalyzer(days, holidays);
    const weeks = weekAnalyzer.getWeeks();

    const dayOffDistributor = new DayOffDistributor(employees, weeks, holidays);
    dayOffDistributor.distribute();

    const hourAllocator = new HourAllocator(employees, days);
    hourAllocator.allocate();

    // Chuyển restDays từ Set thành mảng trước khi lưu
    const employeesToStore = employees.map(emp => ({
        ...emp,
        restDays: Array.from(emp.restDays)
    }));
    localStorage.setItem('employeeSchedules', JSON.stringify(employeesToStore));

    ScheduleRenderer.render(employees, days, month, year, holidays);

    const stats = StatisticsGenerator.generate(employees, days);
    console.log('Thống kê:', stats);
}