#!/usr/bin/python

import sys

LANGUAGES = ['fi', 'sv', 'en']
TSV_FILE_PREFIX = 'Exam-kielipaketti - '
JSON_FILE_PREFIX = '/public/assets/languages/locale-'


def parse_opts():
    if len(sys.argv) < 3:
        raise Exception("usage: " + sys.argv[0] + " <input_dir> <output_dir>")
    return sys.argv[1], sys.argv[2]


def read_file(input_dir, lang):
    file_name = input_dir + "/" + TSV_FILE_PREFIX + lang + '.tsv'
    f = open(file_name)
    return f.read()


def tsv_to_json(input):
    lines = input.split('\r\n')
    objs = []
    for line in lines:
        key, value = line.split('\t')[:2]
        objs.append((key.strip(), value.strip()))

    fields = ['"{0}": "{1}"'.format(obj[0], obj[1].replace('"', '\\"')) for obj in objs]
    return '{\r\n  ' + ',\n  '.join(fields) + '\r\n}\r\n'


def write(content, dir, lang):
    file_name = dir + JSON_FILE_PREFIX + lang + ".json"
    f = open(file_name, 'w')
    f.truncate()
    f.write(content)
    f.close()


def main():
    input_dir, output_dir = parse_opts()
    for lang in LANGUAGES:
        tsv_content = read_file(input_dir, lang)
        json_content = tsv_to_json(tsv_content)
        write(json_content, output_dir,lang)
        print json_content

if __name__ == "__main__":
    main()
