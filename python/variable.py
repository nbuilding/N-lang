from type_check_error import display_type


class Variable:
    def __init__(self, t, value, public=False, mutable=False):
        self.type = t
        self.value = value
        self.public = public
        self.mutable = mutable

    def __repr__(self):
        return "Variable(%s, %s, %s)" % (
            repr(self.type),
            "self" if self.value is self else repr(self.value),
            repr(self.public),
        )
