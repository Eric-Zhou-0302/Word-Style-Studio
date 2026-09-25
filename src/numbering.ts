import type { Level, List } from './model';

const digits = '○一二三四五六七八九';
const legalDigits = '零壹贰叁肆伍陆柒捌玖';

function roman(value: number): string {
  if (value < 1) return String(value);
  const pairs: [number, string][] = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let result = '';
  for (const [unit, symbol] of pairs) {
    const count = Math.floor(value / unit);
    result += symbol.repeat(count);
    value %= unit;
  }
  return result;
}

function chineseGroup(value: number, legal: boolean): string {
  const symbols = legal ? legalDigits : '零一二三四五六七八九';
  const units = legal ? ['','拾','佰','仟'] : ['','十','百','千'];
  let result = '', pendingZero = false;
  for (let power = 3; power >= 0; power--) {
    const digit = Math.floor(value / 10 ** power) % 10;
    if (digit) {
      if (pendingZero) result += symbols[0];
      result += symbols[digit] + units[power];
      pendingZero = false;
    } else if (result && value % 10 ** power) pendingZero = true;
  }
  return result;
}

function chineseNumber(value: number, legal: boolean): string {
  if (!value) return '零';
  // Word 的这两类计数最大为 999999；大写编号的万位采用繁体“萬”。
  if (value > 999999) return '';
  const high = Math.floor(value / 10000), low = value % 10000;
  let result = high ? chineseGroup(high, legal) + (legal ? '萬' : '万') : '';
  if (low) {
    // Word 的 chineseCountingThousand 在万与低位之间不额外写零。
    if (legal && high && low < 1000) result += '零';
    result += chineseGroup(low, legal);
  }
  return !legal && value >= 10 && value < 20 ? result.slice(1) : result;
}

const englishSmall = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const englishTens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function englishNumber(value: number): string {
  if (value < 20) return englishSmall[value];
  if (value < 100) return englishTens[Math.floor(value / 10)] + (value % 10 ? '-' + englishSmall[value % 10] : '');
  if (value < 1000) return englishSmall[Math.floor(value / 100)] + ' hundred' + (value % 100 ? ' ' + englishNumber(value % 100) : '');
  return englishNumber(Math.floor(value / 1000)) + ' thousand' + (value % 1000 ? ' ' + englishNumber(value % 1000) : '');
}
function englishOrdinal(value: number): string {
  const irregular: Record<string, string> = {zero:'zeroth',one:'first',two:'second',three:'third',five:'fifth',eight:'eighth',nine:'ninth',twelve:'twelfth'};
  return englishNumber(value).replace(/[a-z]+$/, word => irregular[word] ?? (word.endsWith('y') ? word.slice(0,-1) + 'ieth' : word + 'th'));
}

export function formatNumber(value: number, format: Level['format']): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('编号必须是非负整数');
  switch (format) {
    case 'decimal': return String(value);
    case 'decimalZero': return String(value).padStart(2,'0');
    case 'upperRoman': return roman(value);
    case 'lowerRoman': return roman(value).toLowerCase();
    // Word 使用重复同一个字母的序列：Z、AA、BB；不是电子表格列号。
    case 'upperLetter': return value ? String.fromCharCode(65 + (value - 1) % 26).repeat(Math.ceil(value / 26)) : '0';
    case 'lowerLetter': return value ? String.fromCharCode(97 + (value - 1) % 26).repeat(Math.ceil(value / 26)) : '0';
    case 'chineseCounting':
      if (value < 10) return digits[value];
      if (value < 100) return (value >= 20 ? digits[Math.floor(value / 10)] : '') + '十' + (value % 10 ? digits[value % 10] : '');
      return String(value).replace(/\d/g, digit => digits[Number(digit)]);
    case 'chineseCountingThousand': return chineseNumber(value, false);
    case 'chineseLegalSimplified': return chineseNumber(value, true);
    case 'ideographTraditional': return value >= 1 && value <= 10 ? '甲乙丙丁戊己庚辛壬癸'[value - 1] : String(value);
    case 'ordinal': {
      const lastTwo = value % 100;
      const ending = lastTwo >= 11 && lastTwo <= 13 ? 'th' : ({1:'st',2:'nd',3:'rd'}[value % 10] ?? 'th');
      return value + ending;
    }
    case 'cardinalText':
    case 'ordinalText': {
      if (value > 999999) return '';
      const result = format === 'cardinalText' ? englishNumber(value) : englishOrdinal(value);
      return result[0].toUpperCase() + result.slice(1);
    }
    case 'bullet': return '•';
    case 'none': return '';
  }
}

function listLevel(list: List, index: number): Level {
  if (!Number.isInteger(index) || index < 0 || index >= list.levels.length) throw new RangeError('列表级别不存在');
  return list.levels[index];
}

export function levelLabel(list: List, index: number, counters?: number[]): string {
  const level = listLevel(list, index);
  if (level.format === 'none') return '';
  if (level.format === 'bullet') return level.text;
  return level.text.replace(/%([0-9]+)/g, (_, reference: string) => {
    const target = Number(reference) - 1;
    if (target < 0 || target > index) return '';
    const referenced = list.levels[target];
    return formatNumber(counters?.[target] ?? referenced.start, level.legal ? 'decimal' : referenced.format);
  });
}

export function simulateList(list: List, sequence: number[]): { level: number; label: string; counters: number[] }[] {
  const counters = list.levels.map(level => level.start);
  const started = list.levels.map(() => false);
  return sequence.map(index => {
    const level = listLevel(list, index);
    counters[index] = started[index] ? counters[index] + 1 : level.start;
    started[index] = true;
    // restart 是一基的上级编号；0 表示跨上级持续编号。
    for (let lower = index + 1; lower < list.levels.length; lower++) {
      if (list.levels[lower].restart === index + 1) {
        counters[lower] = list.levels[lower].start;
        started[lower] = false;
      }
    }
    return {level:index, label:levelLabel(list,index,counters), counters:[...counters]};
  });
}

export function listTestSequence(list:List,preset:'all'|'restart'|'continue'='all',index=0):number[]{
  if(list.levels.length===1)return [0,0,0,0];
  const current=Math.max(0,Math.min(list.levels.length-1,index));
  if(preset==='continue')return [...Array.from({length:current},(_,i)=>i),current,current,current];
  if(preset==='restart'){
    if(current===0)return [0,0,0];
    const trigger=list.levels[current].restart||current;
    return [...Array.from({length:current+1},(_,i)=>i),current,trigger-1,...Array.from({length:current-trigger+1},(_,i)=>trigger+i)];
  }
  return [...Array.from({length:list.levels.length},(_,i)=>i),list.levels.length-1,
    ...Array.from({length:list.levels.length-1},(_,i)=>list.levels.length-2-i),
    ...Array.from({length:list.levels.length-1},(_,i)=>i+1)];
}

export function parseListTestSequence(text:string,levels:number):number[]{
  const parts=text.trim().split(/[\s,，、;；]+/).filter(Boolean);
  if(!parts.length)throw new Error('请输入要测试的层级，例如 1, 2, 3, 2。');
  if(parts.length>100)throw new Error('一次最多测试 100 个条目。');
  if(parts.some(p=>!/^\d+$/.test(p)||Number(p)<1||Number(p)>levels))throw new Error(`层级只能填写 1—${levels} 的整数，用空格或逗号分隔。`);
  return parts.map(p=>Number(p)-1);
}
