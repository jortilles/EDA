export function maxLengthElement(elems:Array<number>){

  let max = -Infinity;

  elems.forEach(elem => {  if(elem > max) max = elem;  });

  return max;

}