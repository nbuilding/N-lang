import lark
from colorama import Fore, Style

class TypeCheckError:
	def __init__(self, token_or_tree, message):
		if type(token_or_tree) is not lark.Token and type(token_or_tree) is not lark.Tree:
			raise TypeError("token_or_tree should be a Lark Token or Tree.")
		self.datum = token_or_tree
		self.message = message

	def display(self, display_type, file):
		output = ""
		color = Fore.RED
		if display_type == "error":
			output += f"{Fore.RED}{Style.BRIGHT}Error{Style.RESET_ALL}"
		elif display_type == "warning":
			output += f"{Fore.YELLOW}{Style.BRIGHT}Warning{Style.RESET_ALL}"
			color = Fore.YELLOW
		else:
			raise ValueError("%s is not a valid display type for TypeCheckError." % display_type)
		output += ": %s\n" % self.message
		if type(self.datum) is lark.Token:
			output += f"{Fore.CYAN} --> {Fore.BLUE}{file.name}:{self.datum.line}:{self.datum.column}{Style.RESET_ALL}\n"
			output += file.display(
				self.datum.line,
				self.datum.column,
				self.datum.end_line,
				self.datum.end_column,
			)
		else:
			output += f"{Fore.CYAN} --> {Fore.BLUE}run.n:{self.datum.line}:{self.datum.column}{Style.RESET_ALL}\n"
			output += file.display(
				self.datum.line,
				self.datum.column,
				self.datum.end_line,
				self.datum.end_column,
				color
			)
		return output

def display_type(n_type, color=True):
	display = ""
	if isinstance(n_type, str):
		display = n_type
	elif isinstance(n_type, tuple):
		display = ' -> '.join(display_type(type, False) for type in n_type)
	elif isinstance(n_type, list):
		if(type(n_type[0]) == lark.Token):
			if (n_type[0].type == "LIST"):
				if len(n_type) >= 2:
					display = 'list[' + display_type(n_type[1], False) + ']'
				else:
					display = 'list[]'
		if display == "":
			display = '(' + ', '.join(display_type(type, False) for type in n_type) + ')'
	elif isinstance(n_type, dict):
		display = "{ %s }" % "; ".join('%s: %s' % (key, display_type(value, False)) for key, value in n_type.items())
	else:
		print('display_type was given a value that is neither a string nor a tuple nor a list nor a dictionary.', n_type)
		return Fore.RED + '???' + Style.RESET_ALL if color else "???"
	return Fore.YELLOW + display + Style.RESET_ALL if color else display
