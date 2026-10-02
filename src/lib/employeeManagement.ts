import type {Employee} from '../types';
export type EmployeeForm={name:string;email:string;phone:string;designation:string;department:string;baseSalary:string;joiningDate:string;role:Employee['role']};
export function validateEmployee(f:EmployeeForm):Omit<Employee,'id'>{
 const name=f.name.trim(),email=f.email.trim().toLowerCase(),phone=f.phone.trim(),designation=f.designation.trim(),department=f.department.trim();
 if(!name||name.length>120)throw Error('Enter employee name (up to120 characters).');
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid email, or leave it blank.');
 if(phone&&!/^\+?[0-9 ()-]{7,24}$/.test(phone))throw Error('Enter a valid phone, or leave it blank.');
 if(!designation||designation.length>120||!department||department.length>100)throw Error('Enter designation and department.');
 if(!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(f.baseSalary)||Number(f.baseSalary)>10000000)throw Error('Enter monthly base salary in rupees (0 allowed).');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(f.joiningDate)||!Number.isFinite(new Date(f.joiningDate+'T12:00:00Z').getTime())||new Date(f.joiningDate+'T12:00:00Z').toISOString().slice(0,10)!==f.joiningDate)throw Error('Choose a valid joining date.');
 if(!['manager','inventory','accountant'].includes(f.role))throw Error('Choose a staff role. Owner access cannot be added here.');
 return {name,email,phone,designation,department,baseSalary:Number(f.baseSalary),joiningDate:f.joiningDate,role:f.role,status:'active'};
}
export function sameEmployee(a:Employee,b:Employee){return JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());}
export function employeeCanLogin(e:Employee){return e.status!=='resigned';}
export function checkEmployeeDuplicate(rows:Employee[],e:Employee){if(rows.some(r=>r.id!==e.id&&((!!e.email&&r.email.toLowerCase()===e.email.toLowerCase())||(!!e.phone&&r.phone.replace(/\D/g,'')===e.phone.replace(/\D/g,'')))))throw Error('An employee with this email or phone already exists.');}
