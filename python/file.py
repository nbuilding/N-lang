from colorama import Fore, Style

class File:
	def __init__(self, file=None, tab_length=4):
		#if the file is none then that means it was duplicated
		self.lines = []
		self.name = ""
		self.line_num_width = 0
		if file != None:
			self.lines = [line.rstrip().replace('\t', ' ' * tab_length) for line in file]
			self.name = file.name
			self.line_num_width = len(str(len(self.lines)))

	def duplicate(self):
		dup = File()
		dup.lines = self.lines[:]
		dup.name = self.name
		dup.line_num_width = self.line_num_width
		return dup

	def parse(self, parser):
		return parser.parse('\n'.join(self.lines))

	def get_line(self, line):
		try:
			return self.lines[line - 1]
		except:
			return "err"

	def get_lines(self, start, end):
		return self.lines[start - 1:end]

	def get_text(self):
		return "\n".join(self.lines)

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
