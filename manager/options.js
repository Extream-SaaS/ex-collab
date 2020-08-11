// room size to dictate machine
// const machineTypes = [
//   [1, 4, 'c2-standard-8'],
//   [5, 10, 'c2-standard-16'],
//   [11, 30, 'c2-standard-30'],
//   [31, 64, 'c2-standard-60']
// ];
// const machineTypes = [
//   [1, 4, 'n2-highcpu-8'],
//   [5, 10, 'n2-highcpu-16'],
//   [11, 30, 'n2-highcpu-48'],
//   [31, 64, 'n2-highcpu-80']
// ];
const machineTypes = [
  [1, 4, 'e2-standard-2'],
  [5, 10, 'e2-standard-8'],
  [11, 30, 'e2-standard-16'],
  [31, 64, 'e2-standard-32']
];
const machineTypeArray = [''];
for (let i = 0; i<machineTypes.length; i++) {
  let x = machineTypes[i][0];
  while (x<machineTypes[i][1]) {
    x++;
    machineTypeArray.push(machineTypes[i][2]);
  }
}
exports.machineTypes = machineTypeArray;