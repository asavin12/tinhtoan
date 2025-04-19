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
        this.employees = [];
        rows.forEach(row => {
            const name = row.querySelector('.employee-name').value.trim();
            const hours = parseFloat(row.querySelector('.total-hours').value) || 0;
            if (name && hours > 0) {
                this.employees.push({ name, totalHours: hours, restDays: new Set() });
            }
        });
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
            const workDays = this.days.filter(day => !employee.restDays.has(day.day)).map(day => day.day);
            let remainingHours = employee.totalHours;
            const dailyHours = new Array(workDays.length).fill(0);

            // Determine min and max hours based on total hours
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

            // Prioritize Saturdays (weekday 6) with max hours, max - 0.5, or max - 1 hours
            const workDaysWithWeekday = workDays.map(day => {
                const dayInfo = this.days.find(d => d.day === day);
                return { day, weekday: dayInfo.weekday };
            });

            // Allocate hours to Saturdays with random selection among max, max-0.5, max-1
            workDaysWithWeekday.forEach((workDay, i) => {
                if (workDay.weekday === 6) { // Saturday
                    const random = Math.random();
                    let hours;
                    if (random < 0.333) {
                        hours = maxHours; // 33.3% chance for max hours
                    } else if (random < 0.666) {
                        hours = maxHours - 0.5; // 33.3% chance for max - 0.5
                    } else {
                        hours = maxHours - 1; // 33.3% chance for max - 1
                    }
                    if (remainingHours >= hours) {
                        dailyHours[i] = hours;
                        remainingHours -= hours;
                    }
                }
            });

            // Allocate minimum hours to remaining days
            workDaysWithWeekday.forEach((workDay, i) => {
                if (dailyHours[i] === 0) { // Skip Saturdays already allocated
                    const hours = minHours;
                    if (remainingHours >= hours) {
                        dailyHours[i] = hours;
                        remainingHours -= hours;
                    }
                }
            });

            // Ensure all days meet minHours by redistributing hours if necessary
            workDaysWithWeekday.forEach((workDay, i) => {
                if (dailyHours[i] > 0 && dailyHours[i] < minHours) {
                    const additionalHoursNeeded = minHours - dailyHours[i];
                    if (remainingHours >= additionalHoursNeeded) {
                        dailyHours[i] += additionalHoursNeeded;
                        remainingHours -= additionalHoursNeeded;
                    } else {
                        // Find days with excess hours to redistribute
                        const excessDays = dailyHours
                            .map((h, idx) => ({ hours: h, idx }))
                            .filter(d => d.hours > minHours && workDaysWithWeekday[d.idx].weekday !== 6);
                        let hoursToRedistribute = additionalHoursNeeded;
                        while (hoursToRedistribute > 0 && excessDays.length > 0) {
                            const donorDay = excessDays[Math.floor(Math.random() * excessDays.length)];
                            const excess = donorDay.hours - minHours;
                            const hoursToTake = Math.min(excess, hoursToRedistribute);
                            dailyHours[donorDay.idx] -= hoursToTake;
                            dailyHours[i] += hoursToTake;
                            hoursToRedistribute -= hoursToTake;
                            excessDays.splice(excessDays.indexOf(donorDay), 1);
                        }
                    }
                }
            });

            // Distribute remaining hours to non-Saturday days
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
                }
            };

            // Adjust if there are still remaining hours
            if (remainingHours > 0) {
                const adjustableDays = dailyHours.map((h, i) => ({ hours: h, index: i }))
                    .filter(d => d.hours < maxHours);
                while (remainingHours > 0 && adjustableDays.length > 0) {
                    const day = adjustableDays[Math.floor(Math.random() * adjustableDays.length)];
                    const increment = Math.min(remainingHours, maxHours - day.hours);
                    dailyHours[day.index] += increment;
                    remainingHours -= increment;
                    adjustableDays.splice(adjustableDays.indexOf(day), 1);
                }
            }

            // Check if total hours are insufficient for minimum requirements
            const totalAllocatedHours = dailyHours.reduce((sum, h) => sum + h, 0);
            if (totalAllocatedHours < employee.totalHours) {
                console.warn(`Cảnh báo: Tổng giờ làm của ${employee.name} (${totalAllocatedHours}) nhỏ hơn yêu cầu (${employee.totalHours}).`);
            }

            // Allocate start time, break time, and end time
            employee.schedule = [];
            let noBreakDays = Math.floor(Math.random() * 2) + 2; // Random 2-3 days with no break
            let noBreakCount = 0;

            workDays.forEach((day, i) => {
                const hours = dailyHours[i];
                if (hours === 0) return;

                const maxStartHour = 21 - hours;
                const startHour = 9 + Math.floor(Math.random() * (maxStartHour - 9 + 1));
                const startMinutes = Math.random() < 0.5 ? '00' : '30';
                const startTime = `${startHour}:${startMinutes}`;

                let breakTime = 0;
                if (noBreakCount < noBreakDays && Math.random() < 0.3) {
                    breakTime = 0;
                    noBreakCount++;
                } else {
                    breakTime = Math.random() < 0.5 ? 0.5 : 1; // 30 or 60 minutes
                }

                // Tính endTime và kiểm tra lỗi NaN
                const endTime = new Date(`2023-01-01 ${startTime}`);
                endTime.setMinutes(endTime.getMinutes() + (hours + breakTime) * 60);
                const endHour = endTime.getHours();
                const endMinutes = endTime.getMinutes();

                let endTimeStr = '-';
                if (!isNaN(endHour) && !isNaN(endMinutes)) {
                    endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
                } else {
                    console.warn(`Lỗi tính toán endTime cho ngày ${day} của ${employee.name}: startTime=${startTime}, hours=${hours}, breakTime=${breakTime}`);
                }

                employee.schedule.push({ day, startTime, endTime: endTimeStr, breakTime, hours });
            });
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

                if (employee.restDays.has(day)) {
                    if (isSunday) {
                        row += `<td><span class="sunday-bold">-</span></td><td><span class="sunday-bold">-</span></td><td><span class="sunday-bold">-</span></td><td><span class="sunday-bold">-</span></td><td><span class="sunday">S</span></td>`;
                    } else if (isHoliday) {
                        row += `<td><span class="holiday-bold">-</span></td><td><span class="holiday-bold">-</span></td><td><span class="holiday-bold">-</span></td><td><span class="holiday-bold">-</span></td><td><span class="holiday">F</span></td>`;
                    } else {
                        row += `<td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>`;
                    }
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
            tableHTML += `<button onclick="printSchedule(${index}, '${employee.name}')">In</button>`;
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

async function printSchedule(employeeId, employeeName) {
    const element = document.getElementById(`employee-${employeeId}`);
    const contentWidth = 794; // Chiều rộng A4 ở 96dpi (210mm * 96 / 25.4)
    const a4Height = 1123; // Chiều cao A4 ở 96dpi (297mm * 96 / 25.4)
    const printScale = 2; // Tỷ lệ để đảm bảo chất lượng ảnh

    // Clone element để không ảnh hưởng đến giao diện gốc
    const clone = element.cloneNode(true);
    clone.classList.add('print-a4'); // Áp dụng CSS cho bản in A4
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    document.body.appendChild(clone);

    // Tính chiều cao thực tế của nội dung
    const contentHeight = clone.scrollHeight * 2; // Nhân đôi để đảm bảo lấy toàn bộ chiều cao

    // Tạo canvas với kích thước đủ lớn để chứa toàn bộ nội dung
    const canvas = await html2canvas(clone, {
        scale: printScale,
        width: contentWidth,
        height: contentHeight,
        windowWidth: contentWidth,
        windowHeight: contentHeight,
        scrollX: 0,
        scrollY: 0
    });

    // Tạo canvas cuối cùng với kích thước A4 chính xác
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = contentWidth; // 794px
    finalCanvas.height = a4Height; // 1123px
    const ctx = finalCanvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, contentWidth, a4Height); // Tô nền trắng

    // Tính tỷ lệ co giãn để vừa A4, giữ nguyên tỷ lệ nội dung
    const sourceWidth = canvas.width / printScale;
    const sourceHeight = canvas.height / printScale;
    const aspectRatio = sourceWidth / sourceHeight;

    let targetWidth, targetHeight;
    if (aspectRatio > contentWidth / a4Height) {
        // Nội dung rộng hơn A4, giới hạn bởi chiều rộng
        targetWidth = contentWidth;
        targetHeight = contentWidth / aspectRatio;
    } else {
        // Nội dung cao hơn A4, giới hạn bởi chiều cao
        targetHeight = a4Height;
        targetWidth = a4Height * aspectRatio;
    }

    // Vẽ ảnh lên canvas A4, căn giữa
    const offsetX = (contentWidth - targetWidth) / 2;
    const offsetY = (a4Height - targetHeight) / 2;
    ctx.drawImage(canvas, offsetX, offsetY, targetWidth, targetHeight);

    // Tải ảnh xuống
    const link = document.createElement('a');
    link.download = `lich_lam_viec_${employeeName.replace(/\s+/g, '_')}.png`;
    link.href = finalCanvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Xóa clone
    document.body.removeChild(clone);
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

    ScheduleRenderer.render(employees, days, month, year, holidays);

    const stats = StatisticsGenerator.generate(employees, days);
    console.log('Thống kê:', stats);
}