import axios from "axios";
/**
 * 格式化 id，適配 8 位、6 位 id
 * @param {number} id
 * @return {string}
 */
export function formatID(id) {
  if (id >= 1000000) {
    // 大於 7 位數，則補全為 8 位
    id = `0${id}`.slice(-8);
  } else {
    // 否則補全為 6 位
    id = `000000${id}`.slice(-6);
  }

  return id;
}

export function formatSeconds(seconds) {
  let h = Math.floor(seconds / 3600) < 10
    ? '0' + Math.floor(seconds / 3600)
    : Math.floor(seconds / 3600)

  let m = Math.floor((seconds / 60 % 60)) < 10
    ? '0' + Math.floor((seconds / 60 % 60))
    : Math.floor((seconds / 60 % 60))

  let s = Math.floor((seconds % 60)) < 10
    ? '0' + Math.floor((seconds % 60))
    : Math.floor((seconds % 60))

  return h === "00"
    ? m + ":" + s
    : h + ":" + m + ":" + s
}

// 解決字串到正則當中的問題
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function basenameWithoutExt(string) {
  const extIdx = string.lastIndexOf('.');
  return extIdx >= 0 ? string.substr(0, extIdx) : string;
}

export function extname(string) {
  const extIdx = string.lastIndexOf('.');
  return extIdx >= 0 ? string.substr(extIdx) : "";
}


export const AILyricTaskStatus = {
  NONE: 0, // 非法狀態
  PENDING: 1, // 任務待申領
  TRASCRIPTING: 2, // 任務已被申領，並等待執行完成
  SUCCESS: 3, // 翻譯成功
  ERROR: 4, // 翻譯失敗
  COUNT: 5, // 狀態總數
}

export const ServerApi = {
  // page start from 1
  // workId: number, a workId like string of "01101111" should convert to number 1101111
  // fileName: string
  // status: number[] of AILyricTaskStatus.***
  // return: {
  //     "pagination": {
  //       "currentPage": 1,
  //       "pageSize": 12,
  //       "totalCount": 2
  //   },
  //   "tasks": [
  //       {
  //           "id": 10,
  //           "work_id": 1004107,
  //           "audio_path": "01_mp3/track02_小穴擔當和校外學習約會.mp3",
  //           "status": 3,
  //           "worker_name": "whisper",
  //           "worker_status": "翻譯進度: 100%",
  //           "title": "純情小穴擔當After"
  //       },
  //       {
  //           "id": 8,
  //           "work_id": 1004107,
  //           "audio_path": "01_mp3/track00_標題名與廣告.mp3",
  //           "status": 3,
  //           "worker_name": "whisper",
  //           "worker_status": "翻譯進度: 100%",
  //           "title": "純情小穴擔當After"
  //       }
  //   ]
  // }
  async searchTask(page, workId, fileName, status) {
    const url = '/api/lyric/translate';
    const params = {
      page,
      work_id: workId || 0,
      file_name: fileName || '',
      status: JSON.stringify(status || []),
    };
    const response = await axios.get(url, { params });
    return response.data;
  },

  polishTask(task) {
    const clone = Object.assign({}, task);

    const fileBasename = task.audio_path.split(/[\\/]/).pop();
    
    clone.fileName = basenameWithoutExt(fileBasename);
    clone.fileExt = extname(fileBasename);
    clone.fileBasename = fileBasename;
    return clone;
  },

  async searchWorkTask(workId, fileName, status) {
    const data = await this.searchTask(-1, workId, fileName || "", []);
    return data.tasks.map(this.polishTask);
  },

  async translateAudio(fileHash) {
    const url = `/api/lyric/translate/${fileHash}`;
    const response = await axios.put(url);
    return response.data;
  },

  async deleteTask(id) {
    const url = `/api/lyric/translate/${id}`;
    const response = await axios.delete(url);
    return response.data;
  }, 

  async redoTask(id) {
    const url = `/api/lyric/translate/redo/${id}`;
    const response = await axios.post(url);
    return response.data;
  },

  async downloadLrc(id) {
    const response = await axios.get(`/api/lyric/translate/lrc`, { params: { id } });
    return response.data.lrcContent;
  },
}

export function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// return [similarity in 0.0~1.0, editDistance]
export function similarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }

  const ed = editDistance(longer, shorter);
  return [(longerLength - ed) / parseFloat(longerLength), ed];
}

export function bidirectionSimilarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  const shorterLength = shorter.length;

  if (longerLength == 0) {
    return 1.0;
  }

  const buf = Array(longerLength).fill(0);
  for (let i = 0; i < shorterLength; ++i) {
    if (longer[i] == shorter[i]) buf[i]++;
    if (longer[longerLength - i - 1] == shorter[shorterLength - i - 1]) buf[longerLength - i]++;
  }

  const samePortion = buf.reduce((acc, x) => acc + (x == 0 ? 0 : 1), 0);
  const value =  samePortion / shorterLength;
  return value;
}

export function audioLyricNameMatch(aname, lname) {
  const oname = basenameWithoutExt(aname);
  const dname = lname;
  
  if (oname === dname) return true; // 完全相等
  else if (oname.includes(dname)) return true;

  // 相似性判斷，要排除一種情況就是作品檔名稱之間極其相似，只有數字序號不同，這個時候相似度極高，需要特殊處理
  
  // 針對SEなし SEなし 這類檔名進行處理
  if (oname.includes("あり") && oname.replace(/あり/g, "なし") === dname) {
    return true;
  }
  if (oname.includes("なし") && oname.replace(/なし/g, "あり") === dname) {
    return true;
  }

  // 去掉檔名中所有的數字後，檢查字串是否一致，
  // 如果一致，說明兩個檔名只有數字不同，不進行任何相似度判斷
  // 直接判定為不同的兩個檔案
  const digitDetector = /\d/g;
  if (digitDetector.test(oname) && digitDetector.test(dname) && oname.replace(digitDetector, "") === dname.replace(digitDetector, "")) {
    return false;
  }

  const [sim, ed] = similarity(oname, dname);
  if (oname.length == dname.length && ed <= 2) {
    // 如果兩個字串長度一樣，編輯距離相差小於2，則認為兩者是僅序號不同的檔案，將其判定為不匹配的音訊和字幕
    return false;
  }

  if (sim > 0.8) return true;
  else if (bidirectionSimilarity(oname, dname) > 0.9) return true;

  return false;
}

// 多關鍵字搜尋子條件型別
export const AdvanceSearchCondType = {
  UNKNOWN: 0,
  FUZZY: 1, // 全文模糊搜尋，包括標題，
  VA: 2,
  TAG: 3,
  CIRCLE: 4,
}
