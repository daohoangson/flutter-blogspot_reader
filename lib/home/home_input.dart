part of 'home.dart';

class _HomeInput extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onSubmitted;

  _HomeInput({this.controller, this.onSubmitted});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(16.0),
        child: TextField(
          autocorrect: false,
          autofocus: true,
          controller: controller,
          decoration: InputDecoration(
            labelText: 'Enter a Blogger domain',
            hintText: 'xxx.blogspot.com',
          ),
          keyboardType: TextInputType.url,
          onSubmitted: onSubmitted,
        ),
      );
}
