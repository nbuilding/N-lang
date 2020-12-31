from colorama import Fore, Style

class File:
	def __init__(self, file, tab_length=4):
		self.lines = [line.rstrip().replace('\t', ' ' * tab_length) for line in file]
		self.line_num_width = len(str(len(self.lines)))

	def parse(self, parser):
		return parser.parse('\n'.join(self.lines))

	def get_line(self, line):
		return self.lines[line - 1]

	def get_lines(self, start, end):
		return self.lines[start - 1:end]

	def display(self, start_line, start_col, end_line, end_col, color=Fore.RED):
		output = []
		if start_line == end_line:
			line = self.get_line(start_line)
			output.append(f"{Fore.CYAN}{start_line:>{self.line_num_width}} | {Style.RESET_ALL}{line}")
			output.append(
				' ' * (self.line_num_width + 2 + start_col) +
				color +
				'^' * (end_col - start_col) +
				Style.RESET_ALL
			)
		else:
			for line_num, line in enumerate(self.get_lines(start_line, end_line), start=start_line):
				if line_num == start_line:
					line = line[:start_col - 1] + Fore.RED + line[start_col - 1:] + Style.RESET_ALL
				elif line_num == end_line:
					line = Fore.RED + line[:end_col - 1] + Style.RESET_ALL + line[end_col - 1:]
				else:
					line = Fore.RED + line + Style.RESET_ALL
				output.append(f"{Fore.CYAN}{line_num:>{self.line_num_width}} | {Style.RESET_ALL}{line}")
		return '\n'.join(output)
