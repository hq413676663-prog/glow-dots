#!/bin/zsh
set -eu
project_dir="${0:A:h}"
if ! command -v python3 >/dev/null 2>&1; then
  print '未找到 Python 3，请先安装 Python 3 后再启动。'
  read '?按回车关闭…'
  exit 1
fi
python3 "$project_dir/local-preview.py"
