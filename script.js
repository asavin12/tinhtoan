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
        this.holidays = holidaysInput
            ? holidaysInput.split(',').map(day => {
                  const trimmed = day.trim();
                  const num = parseInt(trimmed, 10);
                  return isNaN(num) || num < 1 ? null : num;
              }).filter(day => day !== null)
            : [];
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

        rows.forEach((row, index) => {
            const name = row.querySelector('.employee-name').value.trim();
            const hours = parseFloat(row.querySelector('.total-hours').value) || 0;
            const fixedRestDaysInputs = row.querySelectorAll('.fixed-rest-day:checked');
            const fixedRestDays = Array.from(fixedRestDaysInputs).map(input => parseInt(input.value));
            const randomBtn = row.querySelector(`#random-btn-${index + 1}`);
            if (fixedRestDays.length > 0 && randomBtn) {
                randomBtn.classList.add('hide-random-btn');
            } else if (randomBtn) {
                randomBtn.classList.remove('hide-random-btn');
            }
            if (name && hours > 0) {
                const storedEmployee = schedules.find(emp => emp.name === name && emp.totalHours === hours);
                this.employees.push({
                    name,
                    totalHours: hours,
                    fixedRestDays: new Set(fixedRestDays),
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
            if (day.weekday === 1 && currentWeek.length > 0) {
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
                isComplete: workDays === 6,
                workDays: workDays
            };
        });

        return analyzedWeeks;
    }
}

class DayOffDistributor {
    constructor(employees, weeks, holidays, days) {
        this.employees = employees;
        this.weeks = weeks;
        this.holidays = holidays;
        this.days = days;
    }

    distribute() {
        // Thêm ngày lễ và Chủ nhật vào restDays
        this.employees.forEach(employee => {
            employee.restDays = new Set(this.holidays);
            this.days.forEach(day => {
                if (day.weekday === 0) {
                    employee.restDays.add(day.day);
                }
            });
        });

        // Thêm ngày nghỉ cố định vào restDays (coi như ngày nghỉ thường)
        this.employees.forEach(employee => {
            if (employee.fixedRestDays.size > 0) {
                this.days.forEach(day => {
                    if (employee.fixedRestDays.has(day.weekday)) {
                        employee.restDays.add(day.day);
                    }
                });
            }
        });

        // Phân phối ngày nghỉ ngẫu nhiên chỉ cho nhân viên không có ngày nghỉ cố định
        const employeesToRandomize = this.employees.filter(emp => emp.fixedRestDays.size === 0);
        this.weeks.forEach(week => {
            if (week.isComplete) {
                const weekdays = week.days.filter(day => 
                    day.weekday >= 1 && 
                    day.weekday <= 5 && 
                    !this.holidays.has(day.day) && 
                    !this.employees.some(emp => emp.fixedRestDays.has(day.weekday))
                );
                const restAssignments = new Array(weekdays.length).fill(0);
                const restDaysAssigned = new Array(employeesToRandomize.length).fill(false);

                weekdays.forEach((_, dayIndex) => {
                    const availableEmployees = employeesToRandomize
                        .map((emp, idx) => ({ emp, idx }))
                        .filter((_, idx) => !restDaysAssigned[idx]);
                    if (availableEmployees.length === 0) return;

                    const { emp, idx } = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
                    const day = weekdays[dayIndex].day;

                    const prevDay = dayIndex > 0 ? weekdays[dayIndex - 1].day : null;
                    const nextDay = dayIndex < weekdays.length - 1 ? weekdays[dayIndex + 1].day : null;
                    if ((prevDay && emp.restDays.has(prevDay)) || (nextDay && emp.restDays.has(nextDay))) return;

                    emp.restDays.add(day);
                    restAssignments[dayIndex]++;
                    restDaysAssigned[idx] = true;
                });

                weekdays.forEach((_, dayIndex) => {
                    while (restAssignments[dayIndex] < 2 && employeesToRandomize.length > 0) {
                        const availableEmployees = employeesToRandomize
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
            } else {
                const weekdays = week.days.filter(day => 
                    day.weekday >= 1 && 
                    day.weekday <= 6 && 
                    !this.holidays.has(day.day) && 
                    !this.employees.some(emp => emp.fixedRestDays.has(day.weekday))
                );
                if (weekdays.length === 1) {
                    const day = weekdays[0].day;
                    if (weekdays[0].weekday === 6) {
                        // Everyone works on Saturday
                    } else {
                        const employeeIndex = Math.floor(Math.random() * employeesToRandomize.length);
                        employeesToRandomize[employeeIndex].restDays.add(day);
                    }
                } else if (weekdays.length >= 2 && weekdays.length <= 4) {
                    const restDays = weekdays.filter(day => day.weekday !== 6);
                    const restAssignments = new Array(employeesToRandomize.length).fill(false);
                    restDays.forEach(day => {
                        const availableEmployees = employeesToRandomize.filter((_, idx) => !restAssignments[idx]);
                        if (availableEmployees.length > 0) {
                            const employeeIndex = Math.floor(Math.random() * availableEmployees.length);
                            const globalIndex = employeesToRandomize.indexOf(availableEmployees[employeeIndex]);
                            employeesToRandomize[globalIndex].restDays.add(day.day);
                            restAssignments[globalIndex] = true;
                        }
                    });
                }
            }
        });

        // Đảm bảo không phân bổ giờ làm cho ngày lễ và ngày nghỉ cố định
        this.employees.forEach(employee => {
            employee.schedule = employee.schedule.filter(s => !employee.restDays.has(s.day));
        });
    }

    redistributeForEmployee(employee) {
        // Lấy danh sách ngày nghỉ ngẫu nhiên hiện tại
        const fixedRestDays = new Set(this.holidays);
        this.days.forEach(day => {
            if (day.weekday === 0) {
                fixedRestDays.add(day.day);
            }
        });
        const randomRestDays = Array.from(employee.restDays).filter(day => !fixedRestDays.has(day));

        // Tạo bản đồ để ánh xạ ngày sang tuần
        const dayToWeek = new Map();
        this.weeks.forEach((week, weekIndex) => {
            week.days.forEach(day => {
                dayToWeek.set(day.day, { weekIndex, isComplete: week.isComplete });
            });
        });

        // Chọn ngẫu nhiên một ngày nghỉ để hoán đổi
        if (randomRestDays.length === 0) return;

        const restDayIndex = Math.floor(Math.random() * randomRestDays.length);
        const restDay = randomRestDays[restDayIndex];
        const weekInfo = dayToWeek.get(restDay);

        // Không random nếu tuần không hoàn chỉnh
        if (!weekInfo || !weekInfo.isComplete) return;

        // Lấy tất cả các ngày từ Thứ Hai đến Thứ Sáu trong tuần đó
        const week = this.weeks[weekInfo.weekIndex];
        const availableDays = week.days
            .filter(day => 
                day.weekday >= 1 && 
                day.weekday <= 5 && 
                !this.holidays.has(day.day) && 
                !employee.restDays.has(day.day) && 
                !this.employees.some(emp => emp.fixedRestDays.has(day.weekday))
            )
            .map(day => day.day);

        // Nếu không có ngày khả dụng, bỏ qua
        if (availableDays.length === 0) return;

        // Chọn ngẫu nhiên một ngày để hoán đổi
        const swapDayIndex = Math.floor(Math.random() * availableDays.length);
        const swapDay = availableDays[swapDayIndex];

        // Hoán đổi ngày
        employee.restDays.delete(restDay);
        employee.restDays.add(swapDay);

        // Cập nhật lịch làm việc
        employee.schedule = employee.schedule.filter(s => !employee.restDays.has(s.day));
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

            workDays.forEach((day, i) => {
                const hours = dailyHours[i];
                if (hours === 0) return;

                let breakTime;
                if (hours === 4 || hours === 4.5) {
                    breakTime = 0.5;
                } else if (hours >= 5) {
                    breakTime = 1;
                } else {
                    breakTime = 0;
                }

                const maxStartHour = Math.floor(20 - (hours + breakTime));
                const startHour = 9 + Math.floor(Math.random() * (maxStartHour - 9 + 1));
                const startTime = `${startHour}:00`;

                const startParts = startTime.split(':');
                const startHourNum = parseInt(startParts[0], 10);
                const startMinutesNum = parseInt(startParts[1], 10);
                let totalMinutes = startHourNum * 60 + startMinutesNum + (hours + breakTime) * 60;

                let endHour = Math.floor(totalMinutes / 60) % 24;
                let endMinutes = totalMinutes % 60;

                if (endHour > 20 || (endHour === 20 && endMinutes > 0)) {
                    endHour = 20;
                    endMinutes = 0;
                }

                const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

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
                fixedRestDays: emp.fixedRestDays.size,
                totalRestDays: emp.restDays.size
            }))
        };
        return stats;
    }
}

function printSchedule() {
    const employeeManager = new EmployeeManager();
    const employees = employeeManager.loadEmployees();
    const monthInput = document.getElementById('month').value;
    if (!monthInput || employees.length === 0) {
        alert('Vui lòng tạo lịch làm việc trước khi in!');
        return;
    }
    const [year, month] = monthInput.split('-').map(Number);
    const calendar = new CalendarGenerator(year, month);
    const days = calendar.getDays();
    const holidaySet = new HolidayPicker(document.getElementById('holidays').value).getHolidays();

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

    doc.addFileToVFS('Arial.ttf', arialBase64);
    doc.addFont('Arial.ttf', 'Arial', 'normal');
    doc.setFont('Arial', 'normal');

    function sanitizeText(text) {
        if (!text) return '';
        return decodeURIComponent(encodeURIComponent(text));
    }

    employees.forEach((employee, index) => {
        if (index > 0) {
            doc.addPage();
        }
        let y = margin;

        try {
            doc.setFontSize(14);
            doc.text('Zeiterfassung', margin, y);
            y += 8;

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

        y = doc.lastAutoTable.finalY + 8;

        try {
            doc.setFontSize(10);
            doc.text(`Summe der Arbeitsstunden: ${ScheduleRenderer.formatHours(totalWorkHours)}`, margin, y);
            y += 6;

            doc.setFontSize(8);
            doc.text('* Pausen: mind. 30 Minuten täglich (Eingabe im Format 00:00)', margin, y);
            y += 5;
            doc.text('** Abwesenheit: U = Urlaub, K = Krankheit, F = Feiertag, G = Geschäftsreise, T = Zeitausgleich, S = Sonntag', margin, y);
        } catch (error) {
            console.error('Lỗi khi vẽ tổng giờ hoặc chú thích:', error);
            alert('Có lỗi khi thêm tổng giờ hoặc chú thích vào PDF.');
            return;
        }
    });

    doc.save(`danh_sach_thang_${month}_${year}.pdf`);
}

function saveEmployeesToStorage() {
    const rows = document.querySelectorAll('#employeeTable tbody tr');
    const employees = [];
    rows.forEach(row => {
        const name = row.querySelector('.employee-name').value.trim();
        const hours = parseFloat(row.querySelector('.total-hours').value) || 0;
        const fixedRestDaysInputs = row.querySelectorAll('.fixed-rest-day:checked');
        const fixedRestDays = Array.from(fixedRestDaysInputs).map(input => parseInt(input.value));
        if (name) {
            employees.push({ name, hours, fixedRestDays });
        }
    });
    localStorage.setItem('employees', JSON.stringify(employees));
}

function loadEmployeesFromStorage() {
    const storedEmployees = localStorage.getItem('employees');
    const tbody = document.querySelector('#employeeTable tbody');
    tbody.innerHTML = '';

    if (storedEmployees) {
        const employees = JSON.parse(storedEmployees);
        employees.forEach((emp, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="index" data-label="Số thứ tự">${index + 1}</td>
                <td data-label="Tên nhân viên"><input type="text" class="employee-name" value="${emp.name}"></td>
                <td data-label="Tổng số giờ làm"><input type="number" class="total-hours" min="0" value="${emp.hours || ''}"></td>
                <td class="fixed-rest-days" data-label="Ngày nghỉ cố định">
                    <label><input type="checkbox" class="fixed-rest-day" value="1" ${emp.fixedRestDays.includes(1) ? 'checked' : ''}> T2</label>
                    <label><input type="checkbox" class="fixed-rest-day" value="2" ${emp.fixedRestDays.includes(2) ? 'checked' : ''}> T3</label>
                    <label><input type="checkbox" class="fixed-rest-day" value="3" ${emp.fixedRestDays.includes(3) ? 'checked' : ''}> T4</label>
                    <label><input type="checkbox" class="fixed-rest-day" value="4" ${emp.fixedRestDays.includes(4) ? 'checked' : ''}> T5</label>
                    <label><input type="checkbox" class="fixed-rest-day" value="5" ${emp.fixedRestDays.includes(5) ? 'checked' : ''}> T6</label>
                </td>
                <td data-label="Hành động">
                    <button id="random-btn-${index + 1}" class="random-btn ${emp.fixedRestDays.length > 0 ? 'hide-random-btn' : ''}" onclick="randomizeEmployeeRestDays(this)">Random</button>
                    <button onclick="deleteEmployee(this)">Xóa</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    while (tbody.children.length < 3) {
        const row = document.createElement('tr');
        const index = tbody.children.length + 1;
        row.innerHTML = `
            <td class="index" data-label="Số thứ tự">${index}</td>
            <td data-label="Tên nhân viên"><input type="text" class="employee-name"></td>
            <td data-label="Tổng số giờ làm"><input type="number" class="total-hours" min="0"></td>
            <td class="fixed-rest-days" data-label="Ngày nghỉ cố định">
                <label><input type="checkbox" class="fixed-rest-day" value="1"> T2</label>
                <label><input type="checkbox" class="fixed-rest-day" value="2"> T3</label>
                <label><input type="checkbox" class="fixed-rest-day" value="3"> T4</label>
                <label><input type="checkbox" class="fixed-rest-day" value="4"> T5</label>
                <label><input type="checkbox" class="fixed-rest-day" value="5"> T6</label>
            </td>
            <td data-label="Hành động">
                <button id="random-btn-${index}" class="random-btn" onclick="randomizeEmployeeRestDays(this)">Random</button>
                <button onclick="deleteEmployee(this)">Xóa</button>
            </td>
        `;
        tbody.appendChild(row);
    }
}

function addEmployee() {
    const tbody = document.querySelector('#employeeTable tbody');
    const index = tbody.children.length + 1;
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="index" data-label="Số thứ tự">${index}</td>
        <td data-label="Tên nhân viên"><input type="text" class="employee-name"></td>
        <td data-label="Tổng số giờ làm"><input type="number" class="total-hours" min="0"></td>
        <td class="fixed-rest-days" data-label="Ngày nghỉ cố định">
            <label><input type="checkbox" class="fixed-rest-day" value="1"> T2</label>
            <label><input type="checkbox" class="fixed-rest-day" value="2"> T3</label>
            <label><input type="checkbox" class="fixed-rest-day" value="3"> T4</label>
            <label><input type="checkbox" class="fixed-rest-day" value="4"> T5</label>
            <label><input type="checkbox" class="fixed-rest-day" value="5"> T6</label>
        </td>
        <td data-label="Hành động">
            <button id="random-btn-${index}" class="random-btn" onclick="randomizeEmployeeRestDays(this)">Random</button>
            <button onclick="deleteEmployee(this)">Xóa</button>
        </td>
    `;
    tbody.appendChild(row);
    saveEmployeesToStorage();
}

function deleteEmployee(button) {
    const row = button.parentElement.parentElement;
    row.remove();
    const tbody = document.querySelector('#employeeTable tbody');
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
        const randomBtn = row.querySelector('.random-btn');
        if (randomBtn) {
            randomBtn.id = `random-btn-${index + 1}`;
        }
    });
    while (tbody.children.length < 3) {
        const row = document.createElement('tr');
        const index = tbody.children.length + 1;
        row.innerHTML = `
            <td class="index" data-label="Số thứ tự">${index}</td>
            <td data-label="Tên nhân viên"><input type="text" class="employee-name"></td>
            <td data-label="Tổng số giờ làm"><input type="number" class="total-hours" min="0"></td>
            <td class="fixed-rest-days" data-label="Ngày nghỉ cố định">
                <label><input type="checkbox" class="fixed-rest-day" value="1"> T2</label>
                <label><input type="checkbox" class="fixed-rest-day" value="2"> T3</label>
                <label><input type="checkbox" class="fixed-rest-day" value="3"> T4</label>
                <label><input type="checkbox" class="fixed-rest-day" value="4"> T5</label>
                <label><input type="checkbox" class="fixed-rest-day" value="5"> T6</label>
            </td>
            <td data-label="Hành động">
                <button id="random-btn-${index}" class="random-btn" onclick="randomizeEmployeeRestDays(this)">Random</button>
                <button onclick="deleteEmployee(this)">Xóa</button>
            </td>
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

    const dayOffDistributor = new DayOffDistributor(employees, weeks, holidays, days);
    dayOffDistributor.distribute();

    const hourAllocator = new HourAllocator(employees, days);
    hourAllocator.allocate();

    const employeesToStore = employees.map(emp => ({
        ...emp,
        restDays: Array.from(emp.restDays),
        fixedRestDays: Array.from(emp.fixedRestDays)
    }));
    localStorage.setItem('employeeSchedules', JSON.stringify(employeesToStore));

    ScheduleRenderer.render(employees, days, month, year, holidays);

    document.getElementById('printAllButton').style.display = 'inline-block';

    const stats = StatisticsGenerator.generate(employees, days);
    console.log('Thống kê:', stats);
}

function randomizeEmployeeRestDays(button) {
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

    const row = button.parentElement.parentElement;
    const name = row.querySelector('.employee-name').value.trim();
    const hours = parseFloat(row.querySelector('.total-hours').value) || 0;
    const employee = employees.find(emp => emp.name === name && emp.totalHours === hours);
    if (!employee) {
        alert('Không tìm thấy nhân viên này!');
        return;
    }
    if (employee.fixedRestDays.size > 0) {
        alert('Nhân viên có ngày nghỉ cố định không thể random!');
        return;
    }

    const weekAnalyzer = new WeekAnalyzer(days, holidays);
    const weeks = weekAnalyzer.getWeeks();

    const dayOffDistributor = new DayOffDistributor(employees, weeks, holidays, days);
    dayOffDistributor.redistributeForEmployee(employee);

    const hourAllocator = new HourAllocator([employee], days);
    hourAllocator.allocate();

    const employeesToStore = employees.map(emp => ({
        ...emp,
        restDays: Array.from(emp.restDays),
        fixedRestDays: Array.from(emp.fixedRestDays)
    }));
    localStorage.setItem('employeeSchedules', JSON.stringify(employeesToStore));

    ScheduleRenderer.render(employees, days, month, year, holidays);

    document.getElementById('printAllButton').style.display = 'inline-block';

    const stats = StatisticsGenerator.generate(employees, days);
    console.log('Thống kê:', stats);
}