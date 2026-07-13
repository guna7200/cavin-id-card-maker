export interface Region {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  unitId: string;
  doj: string;
  dob: string;
  bloodGroup: string;
  emergencyNo: string;
  photoUrl: string | null;
  photoScale?: number;
  photoOffsetX?: number;
  photoOffsetY?: number;
}
