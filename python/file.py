from colorama import Fore, Style


class File:
    def __init__(self, file=None, tab_length=4, name=None):
        # if the file is none then that means it was duplicated
        self.lines = []
        self.name = name or ""
        self.line_num_width = 0
        if file is not None:
            self.lines = [
                line.rstrip().replace("\t", " " * tab_length) for line in file
            ]
            self.name = file.name if name is None else name
            self.line_num_width = len(str(len(self.lines)))

    def duplicate(self):
        dup = File()
        dup.lines = self.lines[:]
        dup.name = self.name
        dup.line_num_width = self.line_num_width
        return dup

    def parse(self, parser):
        return parser.parse("\n".join(self.lines))

    def get_line(self, line):
        try:
            return self.lines[line - 1]
        except BaseException:
            return "err"

    def get_lines(self, start, end):
        return self.lines[start - 1 : end]

    def get_text(self):
        return "\n".join(self.lines)

    def display(self, start_line, start_col, end_line, end_col, color=Fore.RED, underline=True):
        output = []
        if start_line == end_line:
            line = self.get_line(start_line)
            output.append(
                f"{Fore.CYAN}{start_line:>{self.line_num_width}} | {Style.RESET_ALL}{line}"
            )
            if underline:
                output.append(
                    " " * (self.line_num_width + 2 + start_col)
                    + f"{color + '^' * (end_col - start_col) if underline else ''}"
                    + Style.RESET_ALL
                )
        else:
            for line_num, line in enumerate(
                self.get_lines(start_line, end_line), start=start_line
            ):
                if line_num == start_line:
                    line = (
                        line[: start_col - 1]
                        + f"{color if underline else ''}"
                        + line[start_col - 1 :]
                        + Style.RESET_ALL
                    )
                elif line_num == end_line:
                    line = (
                        f"{color if underline else ''}"
                        + line[: end_col - 1]
                        + Style.RESET_ALL
                        + line[end_col - 1 :]
                    )
                else:
                    line = f"{color if underline else ''}" + line + Style.RESET_ALL
                output.append(
                    f"{Fore.CYAN}{line_num:>{self.line_num_width}} | {Style.RESET_ALL}{line}"
                )
        return "\n".join(output)
