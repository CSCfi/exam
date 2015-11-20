#!/usr/bin/python

import sys

LANGUAGES = ['fi', 'sv', 'en']
TSV_FILE_PREFIX = 'Backend-kielipaketti - '
MSG_FILE_PREFIX = '/conf/messages.'


def parse_opts():
    if len(sys.argv) < 3:
        raise Exception("usage: " + sys.argv[0] + " <input_dir> <output_dir>")
    return sys.argv[1], sys.argv[2]


def filename(input_dir, prefix, lang):
    return input_dir + "/" + prefix + lang + '.tsv'


def read_file(input_dir, lang):
    f = open(filename(input_dir, TSV_FILE_PREFIX, lang))
    return f.read()


def tsv_to_keyvals(input):
    lines = input.split('\r\n')
    objs = []
    for line in lines:
        key, value = line.split('\t')[:2]
        objs.append((key.strip(), value.strip()))

    fields = [obj[0] + '=' + obj[1] for obj in objs]
    return '\r\n'.join(fields) + '\r\n'


def write(content, dir, lang):
    filename = dir + MSG_FILE_PREFIX + lang
    f = open(filename, 'w')
    f.truncate()
    f.write(content)
    f.close()


def main():
    input_dir, output_dir = parse_opts()
    for lang in LANGUAGES:
        tsv_content = read_file(input_dir, lang)
        msg_content = tsv_to_keyvals(tsv_content)
        write(msg_content, output_dir,lang)
        print msg_content

if __name__ == "__main__":
    main()
